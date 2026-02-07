import PDFDocument from 'pdfkit'
import { Prescription, Patient, User, PatientData } from '../types'
import { HTMLToPDFService } from './htmlToPdfService'
import puppeteer from 'puppeteer'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument as PDFLibDocument } from 'pdf-lib'

const formatCPF = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export class PDFService {
  static async generatePrescriptionPDF(
    prescription: Prescription,
    patient: PatientData,
    doctor: User
  ): Promise<string> {
    console.log('=== PDFService.generatePrescriptionPDF ===')
    console.log('Tipo da receita:', prescription.type)
    console.log('Prescription ID:', prescription.id)
    console.log('Total medicamentos:', prescription.medications?.length)

    // Se for controle especial com múltiplos medicamentos, gerar PDF mesclado
    if (prescription.type === 'special_control' && prescription.medications && prescription.medications.length > 1) {
      console.log('→ Controle Especial com múltiplos medicamentos - gerando PDF mesclado')
      
      // Criar uma "prescrição" separada para cada medicamento
      const prescriptionsArray = prescription.medications.map((med, index) => ({
        ...prescription,
        medications: [med]
      }))
      
      return await this.generateMultiPagePrescriptionPDF(prescriptionsArray, patient, doctor)
    }
    
    // Se for controle especial com 1 medicamento, usar HTML → PDF
    if (prescription.type === 'special_control') {
      console.log('→ Usando Puppeteer (HTMLToPDFService)')
      return await HTMLToPDFService.generateSpecialControlPDF(
        prescription,
        patient,
        doctor
      )
    }
    
    // Se for receita simples, usar PDFKit original
    console.log('→ Usando PDFKit')
    return this.generatePrescriptionPDFWithPDFKit(prescription, patient, doctor)
  }

  static async generateMultiPagePrescriptionPDF(
    prescriptions: Prescription[],
    patient: PatientData,
    doctor: User
  ): Promise<string> {
    console.log('=== 🚀 PDFService.generateMultiPagePrescriptionPDF INICIADO ===')
    console.log('📊 Prescriptions recebidas:', prescriptions.length)
    console.log('👤 Patient:', patient.name)
    console.log('👨‍⚕️ Doctor:', doctor.name)
    
    try {
      console.log('🔍 Gerando PDF com template HTML para cada página...')
      
      // Gerar PDF para cada prescrição usando o template HTML
      const pdfPromises = prescriptions.map((prescription, index) => {
        console.log(`📄 Gerando página ${index + 1}/${prescriptions.length} (${prescription.medications?.[0]?.name})...`)
        return HTMLToPDFService.generateSpecialControlPDF(prescription, patient, doctor)
      })
      
      // Aguardar todos os PDFs serem gerados
      const pdfBase64Array = await Promise.all(pdfPromises)
      
      console.log('✅ Todos os PDFs individuais gerados:', pdfBase64Array.length)
      
      // Se for apenas 1 PDF, retornar direto
      if (pdfBase64Array.length === 1) {
        console.log('📄 Apenas 1 PDF, retornando direto')
        return pdfBase64Array[0]
      }
      
      // Merge de múltiplos PDFs
      console.log('🔗 Iniciando merge de', pdfBase64Array.length, 'PDFs...')
      
      const mergedPdf = await PDFLibDocument.create()
      
      for (let i = 0; i < pdfBase64Array.length; i++) {
        console.log(`📑 Adicionando PDF ${i + 1}/${pdfBase64Array.length} ao merge...`)
        
        // Converter base64 para buffer
        const pdfBuffer = Buffer.from(pdfBase64Array[i], 'base64')
        
        // Carregar o PDF
        const pdf = await PDFLibDocument.load(pdfBuffer)
        
        // Copiar todas as páginas do PDF para o PDF mesclado
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        pages.forEach(page => mergedPdf.addPage(page))
        
        console.log(`✅ PDF ${i + 1} adicionado (${pages.length} páginas)`)
      }
      
      // Salvar o PDF mesclado
      const mergedPdfBytes = await mergedPdf.save()
      const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64')
      
      console.log('✅ PDF mesclado gerado:', mergedPdfBytes.length, 'bytes')
      console.log('✅ Total de páginas no PDF final:', mergedPdf.getPageCount())
      
      return mergedPdfBase64
      
    } catch (error) {
      console.error('=== ERRO AO GERAR PDF ===')
      console.error('Mensagem:', error instanceof Error ? error.message : error)
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
      throw new Error(`Falha na geração do PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
  
  private static async generatePrescriptionPDFWithPDFKit(
    prescription: Prescription,
    patient: PatientData,
    doctor: User
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Para receita simples, sempre usar retrato
        const doc = new PDFDocument({ 
          margin: 50,
          layout: 'portrait'
        })
        const chunks: Buffer[] = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks)
          resolve(pdfBuffer.toString('base64'))
        })

        const margemEsq = 80
        const larguraPagina = doc.page.width
        const alturaPagina = doc.page.height

        doc.font('Helvetica')

        // Função para adicionar assinatura na página atual
        const adicionarAssinatura = () => {
          const yAssinatura = alturaPagina * 0.75

          doc.moveTo(larguraPagina / 2 - 170, yAssinatura)
             .lineTo(larguraPagina / 2 + 170, yAssinatura)
             .stroke()

          doc.fontSize(14)
             .text(`${doctor.name.toUpperCase()}`, 0, yAssinatura + 12, { align: 'center' })

          doc.text(`${doctor.crm}`, { align: 'center' })

          // CIDADE + DATA (formato personalizado)
          const data = new Date(prescription.createdAt || new Date())
          const options: Intl.DateTimeFormatOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }
          const dataFormatada = data.toLocaleDateString('pt-BR', options)
          const yRodape = alturaPagina * 0.85

          doc.fontSize(12)
             .text(`Sorriso – MT, ${dataFormatada}`, margemEsq, yRodape)
        }

        // ==============================
        // PACIENTE (RESPIRO SUPERIOR GRANDE)
        // ==============================
        const yPaciente = alturaPagina * 0.15
        doc.fontSize(22).text(`${patient.name}`, margemEsq, yPaciente)

        // ==============================
        // TIPO DE RECEITA (APENAS SIMPLES)
        // ==============================
        const yTipo = alturaPagina * 0.22
        
        // Layout para Receita Simples
        const yUso = alturaPagina * 0.26
        doc.fontSize(16).text('USO ORAL', 0, yUso, { align: 'center' })

        // ==============================
        // MEDICAMENTOS (APENAS PARA RECEITA SIMPLES)
        // ==============================
        let y = alturaPagina * 0.30
        const limitePagina = alturaPagina - 200
        doc.fontSize(13)

        prescription.medications?.forEach((med, index) => {
            // Calcula altura necessária para este medicamento
            let alturaAtual = 16 + 14 // nome + quantidade
            if (med.instructions) {
              alturaAtual += doc.heightOfString(med.instructions, { width: 440 }) + 2
            }
            
            console.log(`Medicamento ${index + 1}: y=${y}, limite=${limitePagina}, alturaAtual=${alturaAtual}, total=${y + alturaAtual}`)
            
            // Verifica se este medicamento cabe na página atual
            if (y + alturaAtual > limitePagina) {
              console.log(`QUEBRA DE PÁGINA antes do medicamento ${index + 1}`)
              
              // Adiciona assinatura na página atual
              adicionarAssinatura()
              
              doc.addPage()
              
              // Cabeçalho na nova página
              const yPaciente = alturaPagina * 0.15
              doc.fontSize(22).text(`${patient.name}`, margemEsq, yPaciente)
              
              const yUso = alturaPagina * 0.26
              doc.fontSize(16).text('USO ORAL', 0, yUso, { align: 'center' })
              y = yUso + 25
              console.log(`Nova página começando em y=${y}`)
            }
            
            // Adiciona medicamento (sempre após verificação)
            doc.fontSize(13).text(`${index + 1}. ${med.name} ${med.dosage}`, margemEsq, y)
            y += 16

            if (med.instructions) {
              doc.fontSize(12)
              const alturaInstrucoes = doc.heightOfString(med.instructions, { 
                width: 440 
              })
              
              doc.text(med.instructions, margemEsq + 8, y, { width: 440 })
              y += alturaInstrucoes + 2
            }

            doc.fontSize(12).text(`   Quantidade: ${med.quantity}`, margemEsq, y)
            y += 22
          })

          // Adicionar assinatura na página inicial (apenas para receita simples)
          adicionarAssinatura()

        doc.end()

      } catch (error) {
        reject(new Error('Falha na geração do PDF'))
      }
    })
  }
}