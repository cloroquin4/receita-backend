import { Router } from 'express'
import { authenticate, type AuthenticatedRequest } from '../middleware/authMiddleware'
import { query } from '../config/database'

const router = Router()

router.use(authenticate)

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search } = req.query
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    let whereClause = ''
    let params: any[] = []

    if (typeof search === 'string' && search.trim()) {
      whereClause = 'WHERE (name ILIKE $1 OR cpf ILIKE $1)'
      params = [`%${search.trim()}%`]
    }

    const result = await query(`
      SELECT id, name, cpf, phone, email, created_at
      FROM patients
      ${whereClause}
      ORDER BY name ASC
      LIMIT 50
    `, params)

    return res.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, cpf, phone, email, address, birthDate } = req.body
    const doctorId = req.user?.userId
    if (!doctorId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    // Verificar se CPF já existe
    const existing = await query('SELECT id FROM patients WHERE cpf = $1 LIMIT 1', [cpf])
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ message: 'Já existe um paciente com este CPF' })
    }

    const result = await query(
      `INSERT INTO patients (name, cpf, phone, email, address, birth_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, cpf, phone, email, created_at`,
      [name, cpf, phone, email, address, birthDate]
    )

    return res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Erro ao criar paciente:', error)
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

    const result = await query(
      'SELECT id, name, cpf, phone, email, address, birth_date, created_at FROM patients WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente não encontrado' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar paciente:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export { router as patientRoutes }
