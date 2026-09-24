import type { DadosAutenticacao } from '../utils/auth'

declare global {
  namespace Express {
    interface Request {
      autenticacao?: DadosAutenticacao
    }
  }
}

export {}
