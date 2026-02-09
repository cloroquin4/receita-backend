import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRoutes } from './routes/authRoutes'
import { patientRoutes } from './routes/patientRoutes'
import { prescriptionRoutes } from './routes/prescriptionRoutes'
import userRoutes from './routes/userRoutes'
import medicationLibraryRoutes from './routes/medicationLibrary'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'
import { initDatabase } from './config/database'

const app = express()
const PORT = process.env.PORT || 5001

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://receita-eta.vercel.app',
  credentials: true
}))
app.use(express.json())
app.use(rateLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/user', userRoutes)
app.use('/api', medicationLibraryRoutes)

app.use(errorHandler)

const startServer = async () => {
  try {
    await initDatabase()
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    })
  } catch (error) {
  console.error('❌ Falha ao iniciar servidor:', error)
  // NÃO finalize o processo
}
}

startServer()
