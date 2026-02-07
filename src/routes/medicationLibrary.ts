import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import {
  searchMedications,
  createMedication,
  getUserMedications,
  updateMedication,
  deleteMedication
} from '../controllers/medicationLibraryController'

const router = Router()

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticate)

// GET /medications?search=termo - Buscar medicamentos com autocomplete
router.get('/medications', searchMedications)

// POST /medications - Criar novo medicamento na biblioteca
router.post('/medications', createMedication)

// GET /medications/list - Listar todos medicamentos do usuário
router.get('/medications/list', getUserMedications)

// PUT /medications/:id - Atualizar medicamento
router.put('/medications/:id', updateMedication)

// DELETE /medications/:id - Excluir medicamento
router.delete('/medications/:id', deleteMedication)

export default router
