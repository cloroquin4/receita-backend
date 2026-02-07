import { Prescription, Patient, User } from '../types'
import { readFileSync } from 'fs'
import { join } from 'path'
const puppeteerHtmlPdf = require('puppeteer-html-pdf')

export class SimpleHTMLToPDFService {
  static async generateSpecialControlPDF(
    prescription: Prescription,
    patient: Patient,
    doctor: User
  ): Promise<string> {
    try {
      // 1. Ler template HTML
      const templatePath = join(__dirname, '../../assets/receitaespecial.html')
      const htmlTemplate = readFileSync(templatePath, 'utf-8')
      
      // 2. Substituir placeholders com dados dinâmicos
      const filledHtml = this.fillTemplate(htmlTemplate, prescription, patient, doctor)
      
      // 3. Gerar PDF com puppeteer-html-pdf (mais simples)
      const pdfBuffer = await puppeteerHtmlPdf.create(filledHtml, {
        format: 'A4',
        landscape: true,
        printBackground: true,
        timeout: 30000
      })
      
      // 4. Converter para base64
      const pdfBase64 = pdfBuffer.toString('base64')
      
      return pdfBase64
      
    } catch (error) {
      console.error('Erro ao gerar PDF com puppeteer-html-pdf:', error)
      throw new Error('Falha na geração do PDF HTML')
    }
  }
  
  private static fillTemplate(
    template: string,
    prescription: Prescription,
    patient: Patient,
    doctor: User
  ): string {
    // 1. Gerar HTML dos medicamentos
    const medicationsHtml = prescription.medications?.map((med, index) => `
      <div style="margin-bottom: 8px; font-size: 11px;">
        <strong>${index + 1}.</strong> ${med.name} ${med.dosage}
        ${med.instructions ? `<br><em style="font-size: 10px;">${med.instructions}</em>` : ''}
        <br><strong>Quantidade:</strong> ${med.quantity}
      </div>
    `).join('') || ''
    
    // 2. Substituir placeholders
    let filledHtml = template
      // Dados do paciente
      .replace('{{PATIENTE_NOME}}', patient.name)
      .replace('{{PATIENTE_CPF}}', this.formatCPF(patient.cpf))
      .replace('{{PATIENTE_ENDERECO}}', patient.address || '')
      .replace('{{PATIENTE_TELEFONE}}', patient.phone || '')
      
      // Dados da receita
      .replace('{{MEDICAMENTOS}}', medicationsHtml)
      .replace('{{DATA_RECEITA}}', new Date(prescription.createdAt || new Date()).toLocaleDateString('pt-BR'))
      
      // Dados do médico
      .replace('{{MEDICO_NOME}}', doctor.name)
      .replace('{{MEDICO_CRM}}', doctor.crm)
      
      // Instructions adicionais
      .replace('{{INSTRUCOES_GERAIS}}', prescription.instructions || '')
    
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
