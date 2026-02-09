import * as htmlPdf from 'html-pdf-node'
import { Prescription, Patient, User, PatientData } from '../types'
import { readFileSync } from 'fs'
import { join } from 'path'

export class HTMLToPDFService {
  static async generateSpecialControlPDF(
    prescription: Prescription,
    patient: PatientData,
    doctor: User
  ): Promise<string> {
    console.log('=== INÍCIO generateSpecialControlPDF ===')
    console.log('Prescription:', JSON.stringify(prescription, null, 2))
    console.log('Patient:', JSON.stringify(patient, null, 2))
    console.log('Doctor:', JSON.stringify(doctor, null, 2))
    
    try {
      // 1. Ler template HTML
      console.log('1. Lendo template HTML...')
      const templatePath = join(__dirname, '../../assets/receitaespecial.html')
      console.log('Template path:', templatePath)
      const htmlTemplate = readFileSync(templatePath, 'utf-8')
      console.log('Template lido, tamanho:', htmlTemplate.length, 'caracteres')
      
      // 2. Substituir placeholders com dados dinâmicos
      console.log('2. Preenchendo template...')
      const filledHtml = this.fillTemplate(htmlTemplate, prescription, patient, doctor)
      console.log('Template preenchido, tamanho:', filledHtml.length, 'caracteres')
      
      // 3. Configurar opções do PDF
      const options: any = {
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        preferCSSPageSize: true
      }
      
      const file: any = { content: filledHtml }
      
      // 4. Gerar PDF usando html-pdf-node
      console.log('3. Gerando PDF com html-pdf-node...')
      const pdfBuffer = await (htmlPdf as any).generatePdf(file, options) as Buffer
      
      // 5. Converter para base64
      const pdfBase64 = pdfBuffer.toString('base64')
      console.log('✅ PDF gerado com sucesso:', pdfBuffer.length, 'bytes')
      
      return pdfBase64
      
    } catch (error) {
      console.error('Erro ao gerar PDF com html-pdf-node:', error)
      console.error('Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : 'No stack',
        name: error instanceof Error ? error.name : 'Unknown'
      })
      throw new Error(`Falha na geração do PDF HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
  
  public static fillTemplate(
    template: string,
    prescription: Prescription,
    patient: PatientData,
    doctor: User
  ): string {
    console.log('=== INÍCIO fillTemplate ===')
    console.log('Template length:', template.length)
    
    // 1. Gerar HTML dos medicamentos
    console.log('1. Gerando HTML dos medicamentos...')
    
    const medicationsHtml = prescription.medications?.map((med, index) => {
      console.log(`Gerando HTML para medicamento ${index + 1}:`, med.name)
      return `
      <div style="margin-bottom: 8px; font-size: 11px;">
        <strong>${index + 1}.</strong> ${med.name} ${med.dosage}
        ${med.instructions ? `<br><em style="font-size: 10px;">${med.instructions}</em>` : ''}
        <br><strong>Quantidade:</strong> ${med.quantity}
      </div>
    `
    }).join('') || ''
    
    console.log('Medications HTML gerado')

    // 2. Substituir placeholders no template
    console.log('2. Substituindo placeholders...')
    
    // Primeiro, substituir os dados dinâmicos
    let filledHtml = template
      .replace(/\{\{PATIENTE_NOME\}\}/g, patient.name || '')
      .replace(/\{\{PATIENTE_CPF\}\}/g, this.formatCPF(patient.cpf || ''))
      .replace(/\{\{PATIENTE_ENDERECO\}\}/g, patient.address || '')
      .replace(/\{\{PATIENTE_TELEFONE\}\}/g, patient.phone || '')
      .replace(/\{\{MEDICAMENTOS\}\}/g, medicationsHtml)
      .replace(/\{\{DATA_RECEITA\}\}/g, new Date(prescription.createdAt || new Date()).toLocaleDateString('pt-BR'))
      .replace(/\{\{MEDICO_NOME\}\}/g, doctor.name || '')
      .replace(/\{\{MEDICO_CRM\}\}/g, doctor.crm || '')
      .replace(/\{\{INSTRUCOES_GERAIS\}\}/g, prescription.instructions || '')

    // 3. IMPORTANTE: Remover o JavaScript que duplica a receita
    // O HTML já está duplicado no template, não precisamos de JavaScript
    console.log('3. Removendo JavaScript de duplicação...')
    filledHtml = filledHtml.replace(/<script>[\s\S]*?<\/script>/gi, '')
    
    console.log('HTML final gerado, tamanho:', filledHtml.length)
    
    return filledHtml
  }
  
  private static formatCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }
}