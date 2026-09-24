import type { NextFunction, Request, Response } from 'express'
import { validarTokenAcesso } from '../utils/auth'

export const requerAutenticacao = (req: Request, res: Response, next: NextFunction) => {
  const cabecalhoAutorizacao = req.headers.authorization

  if (!cabecalhoAutorizacao?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não informado' })
  }

  try {
    req.autenticacao = validarTokenAcesso(cabecalhoAutorizacao.slice(7))
    next()
  } catch {
    return res.status(401).json({ error: 'Token de autenticação inválido ou expirado' })
  }
}
