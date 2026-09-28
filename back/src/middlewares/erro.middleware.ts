import type { NextFunction, Request, Response } from 'express'

export const rotaNaoEncontrada = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' })
}

export const tratarErro = (
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? erro.code : undefined

  if (codigo === 'P2002') {
    return res.status(409).json({ error: 'Já existe um registro com estes dados.' })
  }

  if (codigo === 'P2003') {
    return res.status(409).json({ error: 'Este registro possui dados vinculados e não pode ser removido.' })
  }

  console.error(erro)
  return res.status(500).json({ error: 'Erro interno do servidor.' })
}
