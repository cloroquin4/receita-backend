import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

type JwtPayload = {
  userId: string
  email: string
  name: string
  crm: string
}

export type AuthenticatedRequest = Request & {
  user?: JwtPayload
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' })
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET não configurado' })
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    req.user = decoded
    return next()
  } catch {
    return res.status(401).json({ message: 'Token inválido' })
  }
}
