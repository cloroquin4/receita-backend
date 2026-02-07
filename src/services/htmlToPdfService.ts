import puppeteer from 'puppeteer'
import { Prescription, Patient, User, PatientData } from '../types'
import { readFileSync } from 'fs'
import { join } from 'path'

export class HTMLToPDFService {
  static async generateSpecialControlPDF(
    prescription: Prescription,
    patient: PatientData,
    doctor: User
  ): Promise<string> {
    let browser
    
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
      console.log('Primeiros 200 caracteres do HTML:', filledHtml.substring(0, 200))
      
      // 3. Launch Puppeteer (usando Chrome do macOS)
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        timeout: 60000,
        // Tentar usar Chrome instalado, fallback para Chromium bundled
        executablePath: process.platform === 'darwin' 
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : undefined
      })
      
      const page = await browser.newPage()
      
      // 4. Set content e wait for load
      await page.setContent(filledHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      
      // 5. Gerar PDF (configuração simples)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        timeout: 30000
      })
      
      // 6. Converter para base64
      const pdfBase64 = pdfBuffer.toString('base64')
      
      return pdfBase64
      
    } catch (error) {
      console.error('Erro ao gerar PDF com Puppeteer:', error)
      console.error('Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : 'No stack',
        name: error instanceof Error ? error.name : 'Unknown'
      })
      throw new Error(`Falha na geração do PDF HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }
  
public static fillTemplate(
    template: string,
    prescription: Prescription,
    patient: PatientData,
    doctor: User,
    isSpecialControl: boolean = false
  ): string {
    console.log('=== INÍCIO fillTemplate ===')
    console.log('isSpecialControl:', isSpecialControl)
    console.log('Template length:', template.length)
    
    // 1. Gerar HTML dos medicamentos
    console.log('1. Gerando HTML dos medicamentos...')
    console.log('Medications:', JSON.stringify(prescription.medications, null, 2))
    
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
    
    console.log('Medications HTML gerado:', medicationsHtml)

    // 2. Substituir placeholders
    console.log('2. Substituindo placeholders...')
    let filledHtml = template
      // Dados do paciente
      .replace('{{PATIENTE_NOME}}', patient.name || '')
      .replace('{{PATIENTE_CPF}}', this.formatCPF(patient.cpf || ''))
      .replace('{{PATIENTE_ENDERECO}}', patient.address || '')
      .replace('{{PATIENTE_TELEFONE}}', patient.phone || '')

      // Dados da receita - TRATAMENTO ESPECIAL PARA CONTROLE ESPECIAL
      .replace('{{MEDICAMENTOS}}', medicationsHtml)
      .replace('{{DATA_RECEITA}}', new Date(prescription.createdAt || new Date()).toLocaleDateString('pt-BR'))

      // Dados do médico
      .replace('{{MEDICO_NOME}}', doctor.name || '')
      .replace('{{MEDICO_CRM}}', doctor.crm || '')

      // Instructions adicionais
      .replace('{{INSTRUCOES_GERAIS}}', prescription.instructions || '')

    console.log('HTML final gerado, tamanho:', filledHtml.length)
    console.log('Primeiros 200 caracteres do HTML final:', filledHtml.substring(0, 200))
    
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
