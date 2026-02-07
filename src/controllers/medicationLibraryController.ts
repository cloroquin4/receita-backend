import { Request, Response } from 'express'
import { query } from '../config/database'
import { AuthenticatedRequest } from '../middleware/authMiddleware'

export const searchMedications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    if (!search || typeof search !== 'string' || search.trim().length < 2) {
      res.json([])
      return
    }

    const searchQuery = `%${search.trim().toLowerCase()}%`

    const result = await query(`
      SELECT 
        id,
        name,
        default_dosage as "defaultDosage",
        default_instructions as "defaultInstructions"
      FROM medication_library 
      WHERE user_id = $1 
        AND LOWER(name) LIKE $2
      ORDER BY name ASC
      LIMIT 20
    `, [userId, searchQuery])

    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar medicamentos:', error)
    res.status(500).json({ error: 'Erro ao buscar medicamentos' })
  }
}

export const createMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    const { name, defaultDosage, defaultInstructions } = req.body

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Nome do medicamento é obrigatório' })
      return
    }

    // Verificar se medicamento já existe para este usuário
    const existing = await query(`
      SELECT id FROM medication_library 
      WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `, [userId, name.trim()])

    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: 'Medicamento já existe na sua biblioteca' })
      return
    }

    const result = await query(`
      INSERT INTO medication_library (user_id, name, default_dosage, default_instructions)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        name,
        default_dosage as "defaultDosage",
        default_instructions as "defaultInstructions",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [userId, name.trim(), defaultDosage || null, defaultInstructions || null])

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Erro ao criar medicamento:', error)
    res.status(500).json({ error: 'Erro ao criar medicamento' })
  }
}

export const getUserMedications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    const result = await query(`
      SELECT 
        id,
        name,
        default_dosage as "defaultDosage",
        default_instructions as "defaultInstructions",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM medication_library 
      WHERE user_id = $1
      ORDER BY name ASC
    `, [userId])

    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar medicamentos:', error)
    res.status(500).json({ error: 'Erro ao listar medicamentos' })
  }
}

export const updateMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const { id } = req.params
    const { name, defaultDosage, defaultInstructions } = req.body

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Nome do medicamento é obrigatório' })
      return
    }

    // Verificar se medicamento existe e pertence ao usuário
    const existing = await query(`
      SELECT id FROM medication_library 
      WHERE id = $1 AND user_id = $2
    `, [id, userId])

    if (!existing.rowCount || existing.rowCount === 0) {
      res.status(404).json({ error: 'Medicamento não encontrado' })
      return
    }

    // Verificar se novo nome já existe para este usuário (se nome mudou)
    const nameCheck = await query(`
      SELECT id FROM medication_library 
      WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
    `, [userId, name.trim(), id])

    if (nameCheck.rowCount && nameCheck.rowCount > 0) {
      res.status(409).json({ error: 'Medicamento já existe na sua biblioteca' })
      return
    }

    const result = await query(`
      UPDATE medication_library 
      SET 
        name = $1,
        default_dosage = $2,
        default_instructions = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING 
        id,
        name,
        default_dosage as "defaultDosage",
        default_instructions as "defaultInstructions",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [name.trim(), defaultDosage || null, defaultInstructions || null, id, userId])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar medicamento:', error)
    res.status(500).json({ error: 'Erro ao atualizar medicamento' })
  }
}

export const deleteMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const { id } = req.params

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    const result = await query(`
      DELETE FROM medication_library 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId])

    if (!result.rowCount || result.rowCount === 0) {
      res.status(404).json({ error: 'Medicamento não encontrado' })
      return
    }

    res.json({ message: 'Medicamento excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir medicamento:', error)
    res.status(500).json({ error: 'Erro ao excluir medicamento' })
  }
}
