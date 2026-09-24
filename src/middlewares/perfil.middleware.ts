import type { NextFunction, Request, Response } from 'express'
import type { DadosAutenticacao } from '../utils/auth'

type Perfil = DadosAutenticacao['perfil']

export const requerPerfil = (...perfisPermitidos: Perfil[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.autenticacao) {
      return res.status(401).json({ error: 'Autenticação obrigatória.' })
    }

    if (!perfisPermitidos.includes(req.autenticacao.perfil)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' })
    }

    next()
  }
}
