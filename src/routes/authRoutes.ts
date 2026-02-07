import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { query } from '../config/database'
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Rotas públicas (sem autenticação)
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Dados inválidos', issues: parsed.error.issues })
  }

  const { email, password } = parsed.data

  const result = await query('SELECT id, email, password, name, crm FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]

  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas' })
  }

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    return res.status(401).json({ message: 'Credenciais inválidas' })
  }

  const secret: Secret | undefined = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET não configurado' })
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']
  const options: SignOptions = { expiresIn }
  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name, crm: user.crm },
    secret,
    options,
  )

  return res.json({
    user: { id: user.id, email: user.email, name: user.name, crm: user.crm },
    token,
  })
})

// Aplicar middleware de autenticação nas rotas protegidas
router.use(authenticate)

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  crm: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

router.get('/me', async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId
  if (!userId) {
    return res.status(401).json({ message: 'Não autenticado' })
  }

  try {
    const result = await query(
      'SELECT id, email, name, crm FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado' })
    }

    return res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.put('/user/update', async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId
  if (!userId) {
    return res.status(401).json({ message: 'Não autenticado' })
  }

  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Dados inválidos', issues: parsed.error.issues })
  }

  const { name, crm, email } = parsed.data

  try {
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (crm) {
      updates.push(`crm = $${paramIndex++}`)
      values.push(crm)
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`)
      values.push(email)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(userId)

    const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, crm`
    
    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    return res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(400).json({ message: 'Email já está em uso' })
    }
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/register', (req, res) => {
  res.status(405).json({ message: 'Cadastro desabilitado (usuário único por enquanto).' })
})

export { router as authRoutes }
