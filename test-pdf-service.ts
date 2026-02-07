import { HTMLToPDFService } from './src/services/htmlToPdfService'
import { Prescription, Patient, User, PatientData } from './src/types'

// Dados de teste
const prescription: Prescription = {
  id: '1',
  type: 'special_control',
  medications: [
    {
      id: '1',
      name: 'Paracetamol',
      dosage: '500mg',
      quantity: '20 comprimidos',
      instructions: 'Tomar 1 comprimido a cada 6 horas'
    }
  ],
  instructions: 'Receita de controle especial',
  createdAt: new Date(),
  updatedAt: new Date(),
  patientId: '1',
  doctorId: '1',
  pdfUrl: ''
}

const patient: PatientData = {
  id: '1',
  name: 'João Silva',
  cpf: '12345678901',
  phone: '(65) 99999-8888',
  email: 'joao@email.com',
  address: 'Rua A, 123 - Centro',
  birthDate: '1990-01-01',
  createdAt: new Date(),
  updatedAt: new Date()
}

const doctor: User = {
  id: '1',
  name: 'Dr. Carlos Santos',
  email: 'carlos@email.com',
  crm: '12345/MT',
  password: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date()
}

async function testPDFGeneration() {
  try {
    console.log('=== Teste de Geração de PDF ===')
    const pdfBase64 = await HTMLToPDFService.generateSpecialControlPDF(
      prescription,
      patient,
      doctor
    )
    console.log('PDF gerado com sucesso!')
    console.log('Tamanho do PDF:', pdfBase64.length, 'caracteres')
    
    // Salvar PDF em arquivo para verificação
    const fs = require('fs')
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    fs.writeFileSync('test-output.pdf', pdfBuffer)
    console.log('PDF salvo em test-output.pdf')
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
  }
}

testPDFGeneration()