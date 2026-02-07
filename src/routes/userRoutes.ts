import { Router } from 'express'
import { query } from '../config/database'
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware'
import { z } from 'zod'

const router = Router()

router.use(authenticate)

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  crm: z.string().min(1, 'CRM é obrigatório')
  // Removido specialty e phone porque não existem no banco
})

// GET /api/user/profile - Buscar perfil do usuário
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const result = await query(
      'SELECT id, name, email, crm, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    const user = result.rows[0]
    return res.json(user)
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// PUT /api/user/profile - Atualizar perfil do usuário
router.put('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const validatedData = updateProfileSchema.parse(req.body)

    // Atualizar usuário no banco (apenas colunas que existem)
    await query(
      `UPDATE users 
       SET name = $1, email = $2, crm = $3, updated_at = NOW()
       WHERE id = $4`,
      [
        validatedData.name,
        validatedData.email,
        validatedData.crm,
        userId
      ]
    )

    // Buscar usuário atualizado
    const result = await query(
      'SELECT id, name, email, crm, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    const updatedUser = result.rows[0]
    return res.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: error.errors 
      })
    }

    console.error('Erro ao atualizar perfil:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

export default router
