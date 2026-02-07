import { Router } from 'express'
import { query } from '../config/database'
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware'
import { PDFService } from '../services/pdfService'
import { z } from 'zod'
import { PatientData } from '../types'

const router = Router()

router.use(authenticate)

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid().optional(),
  newPatient: z.object({
    name: z.string().min(1),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    address: z.string().optional(),
    birthDate: z.string().optional(),
  }).optional(),
  type: z.enum(['simple', 'special_control']),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    quantity: z.string().min(1),
    instructions: z.string().optional(),
  })).min(1),
  instructions: z.string().min(1),
})

const updatePrescriptionSchema = z.object({
  type: z.enum(['simple', 'special_control']),
  medications: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    dosage: z.string().min(1),
    quantity: z.string().min(1),
    instructions: z.string().optional(),
  })).min(1),
  instructions: z.string().min(1),
})

router.get('/:id/pdf', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Buscar receita com paciente e medicamentos
    const result = await query(`
      SELECT 
        p.id,
        p.type,
        p.instructions,
        p.created_at,
        p.patient_id,
        pt.name AS patient_name,
        pt.cpf AS patient_cpf,
        pt.phone AS patient_phone,
        pt.email AS patient_email,
        pt.address AS patient_address,
        pt.birth_date AS patient_birth_date
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      WHERE p.id = $1 AND p.doctor_id = $2
    `, [id, userId])

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Receita não encontrada' })
    }

    const prescription = result.rows[0]

    // Buscar medicamentos
    const medsResult = await query(`
      SELECT name, dosage, quantity, instructions
      FROM medications
      WHERE prescription_id = $1
      ORDER BY created_at ASC
    `, [id])

    prescription.medications = medsResult.rows

    // Buscar dados do médico
    console.log('=== DEBUG PDF ===')
    console.log('userId:', userId)
    
    const userResult = await query(
      'SELECT id, email, name, crm FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Médico não encontrado' })
    }

    const doctor = userResult.rows[0]
    console.log('doctor from DB:', doctor)
    console.log('==================')

    // Gerar PDF em Base64
    const pdfBase64 = await PDFService.generatePrescriptionPDF(
      prescription,
      {
        id: prescription.patient_id,
        name: prescription.patient_name,
        cpf: prescription.patient_cpf,
        phone: prescription.patient_phone,
        email: prescription.patient_email,
        address: prescription.patient_address,
        birthDate: prescription.patient_birth_date,
        createdAt: prescription.created_at,
        updatedAt: prescription.created_at,
      },
      doctor
    )

    return res.json({ pdfBase64 })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Buscar receita específica com paciente e medicamentos
    const result = await query(`
      SELECT 
        p.id,
        p.type,
        p.instructions,
        p.pdf_url,
        p.created_at,
        pt.name AS patient_name,
        pt.cpf AS patient_cpf
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      WHERE p.id = $1 AND p.doctor_id = $2
    `, [id, userId])

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Receita não encontrada' })
    }

    const prescription = result.rows[0]

    // Buscar medicamentos da receita
    const medsResult = await query(`
      SELECT name, dosage, quantity, instructions
      FROM medications
      WHERE prescription_id = $1
      ORDER BY created_at ASC
    `, [id])

    prescription.medications = medsResult.rows

    return res.json(prescription)
  } catch (error) {
    console.error('Erro ao buscar receita:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const result = await query(`
      SELECT
        p.id,
        p.type,
        p.instructions,
        p.pdf_url,
        p.created_at,
        pt.name AS patient_name,
        pt.cpf AS patient_cpf
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      WHERE p.doctor_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [userId])

    const prescriptions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      instructions: row.instructions,
      pdfUrl: row.pdf_url,
      createdAt: row.created_at,
      patient: {
        name: row.patient_name,
        cpf: row.patient_cpf,
      },
    }))

    return res.json(prescriptions)
  } catch (error) {
    console.error('Erro ao buscar receitas:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/', async (req: AuthenticatedRequest, res) => {
  console.log('POST /api/prescriptions RECEBIDO!')
  console.log('=== INÍCIO POST /api/prescriptions ===')
  console.log('Body recebido:', JSON.stringify(req.body, null, 2))
  console.log('=====================================')
  
  try {
    const parsed = createPrescriptionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos', issues: parsed.error.issues })
    }

    const { patientId, newPatient, type, medications, instructions } = parsed.data
    const doctorId = req.user?.userId
    if (!doctorId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Lógica unificada para todas as receitas (simples e controle especial)
    let finalPatientId = patientId
    if (newPatient) {
      const patientResult = await query(`
        INSERT INTO patients (name, cpf, phone, email, address, birth_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [newPatient.name, newPatient.cpf, newPatient.phone, newPatient.email, newPatient.address, newPatient.birthDate])
      
      finalPatientId = patientResult.rows[0].id
    }

    const prescriptionResult = await query(`
      INSERT INTO prescriptions (patient_id, doctor_id, type, instructions, pdf_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `, [finalPatientId, doctorId, type, instructions, ''])

    const prescriptionId = prescriptionResult.rows[0].id

    for (const medication of medications) {
      await query(`
        INSERT INTO medications (prescription_id, name, dosage, quantity, instructions, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [prescriptionId, medication.name, medication.dosage, medication.quantity, medication.instructions])
    }

    // Gerar PDF para receita simples
    const prescriptionData = {
      id: prescriptionId,
      type,
      instructions,
      created_at: new Date().toISOString(),
      patient_id: finalPatientId,
      medications: medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        quantity: med.quantity,
        instructions: med.instructions
      }))
    }

    // Buscar dados completos do paciente do banco de dados
    const patientResult = await query(
      'SELECT id, name, cpf, phone, email, address, birth_date, created_at, updated_at FROM patients WHERE id = $1 LIMIT 1',
      [finalPatientId]
    )

    if (patientResult.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente não encontrado' })
    }

    const patientFromDB = patientResult.rows[0]
    const patientData: PatientData = {
      id: patientFromDB.id,
      name: patientFromDB.name,
      cpf: patientFromDB.cpf,
      phone: patientFromDB.phone,
      email: patientFromDB.email || '',
      address: patientFromDB.address || '',
      birthDate: patientFromDB.birth_date || '',
      createdAt: patientFromDB.created_at,
      updatedAt: patientFromDB.updated_at
    }

    console.log('=== DADOS DO PACIENTE PARA PDF ===')
    console.log('PatientData:', JSON.stringify(patientData, null, 2))
    console.log('==================================')

    const doctorResult = await query(
      'SELECT id, email, name, crm FROM users WHERE id = $1 LIMIT 1',
      [doctorId]
    )

    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ message: 'Médico não encontrado' })
    }

    const doctor = doctorResult.rows[0]

    console.log('=== DADOS DO MÉDICO PARA PDF ===')
    console.log('Doctor:', JSON.stringify(doctor, null, 2))
    console.log('================================')

    const pdfBase64 = await PDFService.generatePrescriptionPDF(
      prescriptionData as any,
      patientData,
      doctor
    )

    return res.json({ 
      id: prescriptionId,
      pdfBase64,
      message: 'Receita criada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao criar receita:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: error.errors 
      })
    }
    return res.status(500).json({ 
      message: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Validar dados de entrada
    const validatedData = updatePrescriptionSchema.parse(req.body)

    // Verificar se a receita existe e pertence ao usuário
    const prescriptionResult = await query(`
      SELECT id FROM prescriptions 
      WHERE id = $1 AND doctor_id = $2
    `, [id, userId])

    if (prescriptionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Receita não encontrada' })
    }

    // Atualizar dados da receita
    await query(`
      UPDATE prescriptions 
      SET type = $1, instructions = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [validatedData.type, validatedData.instructions, id])

    // Deletar medicamentos existentes
    await query('DELETE FROM medications WHERE prescription_id = $1', [id])

    // Inserir medicamentos atualizados
    for (const med of validatedData.medications) {
      await query(`
        INSERT INTO medications (prescription_id, name, dosage, quantity, instructions, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [id, med.name, med.dosage, med.quantity, med.instructions])
    }

    return res.json({
      message: 'Receita atualizada com sucesso',
      id,
      type: validatedData.type,
      instructions: validatedData.instructions,
      medications: validatedData.medications,
    })

  } catch (error) {
    console.error('Erro ao atualizar receita:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: error.errors 
      })
    }
    return res.status(500).json({ message: 'Erro interno' })
  }
})

// GET /api/prescriptions/:id - Buscar receita para edição
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Buscar receita com paciente e medicamentos
    const result = await query(`
      SELECT 
        p.id,
        p.type,
        p.instructions,
        p.created_at,
        pt.id AS patient_id,
        pt.name AS patient_name,
        pt.cpf AS patient_cpf,
        pt.phone AS patient_phone,
        pt.email AS patient_email,
        pt.address AS patient_address,
        pt.birth_date AS patient_birthDate
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      WHERE p.id = $1 AND p.doctor_id = $2
    `, [id, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Receita não encontrada' })
    }

    const prescription = result.rows[0]

    // Buscar medicamentos
    const medicationsResult = await query(`
      SELECT id, name, dosage, quantity, instructions
      FROM medications
      WHERE prescription_id = $1
      ORDER BY created_at ASC
    `, [id])

    return res.json({
      ...prescription,
      medications: medicationsResult.rows,
    })
  } catch (error) {
    console.error('Erro ao buscar receita:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/patient/:patientId', (req, res) => {
  res.json({ message: 'Get prescriptions by patient endpoint' })
})

export { router as prescriptionRoutes }
