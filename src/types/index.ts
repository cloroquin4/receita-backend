export interface User {
  id: string
  email: string
  password: string
  name: string
  crm: string
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  name: string
  cpf: string
  phone: string
  email?: string
  address?: string
  birthDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PatientData {
  id: string
  name: string
  cpf: string
  phone: string
  email?: string
  address?: string
  birthDate?: string
  createdAt: Date
  updatedAt: Date
}

export interface Prescription {
  id: string
  patientId: string
  doctorId: string
  type: 'simple' | 'special_control'
  medications: Medication[]
  instructions: string
  pdfUrl: string
  createdAt: Date
  updatedAt: Date
}

export interface Medication {
  id: string
  name: string
  dosage: string
  quantity: string
  instructions?: string
}

export interface AuthRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
}

export interface CreatePatientRequest {
  name: string
  cpf: string
  phone: string
  email?: string
  address?: string
  birthDate?: string
}

export interface CreatePrescriptionRequest {
  patientId: string
  type: 'simple' | 'special_control'
  medications: Omit<Medication, 'id'>[]
  instructions: string
}
