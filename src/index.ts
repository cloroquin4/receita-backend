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
const isProduction = process.env.NODE_ENV === 'production'

// Helmet com configurações mais flexíveis
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS configurado corretamente para produção e desenvolvimento
const allowedOrigins = [
  'https://receita-eta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
]

// Adicionar origem do .env se existir
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (Postman, curl, etc) em desenvolvimento
    if (!origin && !isProduction) {
      return callback(null, true)
    }
    
    // Verificar se a origem está permitida
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('⚠️ Origem bloqueada por CORS:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Rate limiter apenas em produção para não atrapalhar testes
if (isProduction) {
  app.use(rateLimiter)
}

// Health check endpoint - IMPORTANTE para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Receita Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      patients: '/api/patients',
      prescriptions: '/api/prescriptions',
      user: '/api/user',
      medications: '/api/medication-library'
    }
  })
})

// Rotas da API
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/user', userRoutes)
app.use('/api', medicationLibraryRoutes)

// Error handler por último
app.use(errorHandler)

const startServer = async () => {
  try {
    console.log('🔄 Iniciando servidor...')
    console.log('📍 Ambiente:', isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO')
    console.log('🌐 CORS permitido para:', allowedOrigins)
    
    await initDatabase()
    
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`)
      console.log(`🏥 Health check: http://localhost:${PORT}/health`)
      console.log(`📡 API Base: http://localhost:${PORT}/api`)
    })
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error)
    // Em produção, tentar novamente após 5 segundos
    if (isProduction) {
      console.log('🔄 Tentando reiniciar em 5 segundos...')
      setTimeout(startServer, 5000)
    } else {
      process.exit(1)
    }
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  if (!isProduction) {
    process.exit(1)
  }
})

startServer()