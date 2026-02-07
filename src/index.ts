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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`)
      console.log(`📊 Dashboard: http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error)
    process.exit(1)
  }
}

startServer()
