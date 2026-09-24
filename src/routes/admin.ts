import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requerAutenticacao } from '../middlewares/auth.middleware'
import { requerPerfil } from '../middlewares/perfil.middleware'

const rotas = Router()
const schemaIdPrestador = z.string().uuid('ID de prestador inválido.')
const schemaFiltroPrestador = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BANNED']).optional(),
})
const schemaDestaque = z.object({ destaque: z.boolean() })

const inclusaoPrestador = {
  user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
  category: true,
  _count: { select: { reviews: true, requests: true } },
}

const inclusaoSolicitacao = {
  category: true,
  client: { select: { id: true, name: true, email: true, phone: true } },
  provider: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      category: true,
    },
  },
}

const obterPrestador = (idPrestador: string) =>
  prisma.providerProfile.findUnique({ where: { id: idPrestador }, include: inclusaoPrestador })

const atualizarStatusPrestador = async (
  idPrestador: string,
  statusAtual: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BANNED',
  novoStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BANNED',
) => {
  const transicoesPermitidas = {
    APPROVED: ['PENDING'],
    REJECTED: ['PENDING'],
    SUSPENDED: ['APPROVED'],
    BANNED: ['PENDING', 'APPROVED', 'SUSPENDED'],
  } as const

  if (!transicoesPermitidas[novoStatus].includes(statusAtual as never)) {
    return null
  }

  return prisma.providerProfile.update({
    where: { id: idPrestador },
    data: {
      approvalStatus: novoStatus,
      ...(novoStatus === 'APPROVED' ? {} : { isAvailable: false }),
    },
    include: inclusaoPrestador,
  })
}

const criarRotaAtualizacaoStatus = (novoStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BANNED') =>
  async (req: Parameters<typeof rotas.patch>[1] extends (...argumentos: infer Argumentos) => unknown ? Argumentos[0] : never,
    res: Parameters<typeof rotas.patch>[1] extends (...argumentos: infer Argumentos) => unknown ? Argumentos[1] : never) => {
    const validacaoId = schemaIdPrestador.safeParse(req.params.id)
    if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

    const prestador = await obterPrestador(validacaoId.data)
    if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado.' })

    const prestadorAtualizado = await atualizarStatusPrestador(
      prestador.id,
      prestador.approvalStatus,
      novoStatus,
    )
    if (!prestadorAtualizado) {
      return res.status(409).json({ error: 'Transição de status não permitida.' })
    }

    res.json({ prestador: prestadorAtualizado })
  }

rotas.use(requerAutenticacao, requerPerfil('ADMIN'))

rotas.get('/dashboard', async (_req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Consulta os indicadores administrativos'
    #swagger.description = 'Retorna totais e agrupamentos usados no painel administrativo.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Indicadores retornados com sucesso.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const [prestadoresPorStatus, solicitacoesPorStatus, totalClientes, totalAvaliacoes] = await Promise.all([
    prisma.providerProfile.groupBy({ by: ['approvalStatus'], _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.review.count(),
  ])

  res.json({
    clientes: totalClientes,
    avaliacoes: totalAvaliacoes,
    prestadoresPorStatus: prestadoresPorStatus.map((item) => ({
      status: item.approvalStatus,
      quantidade: item._count._all,
    })),
    solicitacoesPorStatus: solicitacoesPorStatus.map((item) => ({
      status: item.status,
      quantidade: item._count._all,
    })),
  })
})

rotas.get('/providers', async (req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Lista os prestadores para administração'
    #swagger.description = 'Lista todos os prestadores, com filtro opcional pelo status de aprovação.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['status'] = { in: 'query', required: false, schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BANNED'] }, description: 'Status de aprovação do prestador.' }
    #swagger.responses[200] = { description: 'Prestadores retornados com sucesso.' }
    #swagger.responses[400] = { description: 'Filtro de status inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const validacao = schemaFiltroPrestador.safeParse(req.query)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const prestadores = await prisma.providerProfile.findMany({
    where: validacao.data.status ? { approvalStatus: validacao.data.status } : {},
    include: inclusaoPrestador,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ prestadores })
})

rotas.patch(
  '/providers/:id/approve',
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Aprova um prestador'
    #swagger.description = 'Aprova um prestador que está com o cadastro pendente.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Prestador aprovado com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Transição de status não permitida.' }
  */
  criarRotaAtualizacaoStatus('APPROVED'),
)
rotas.patch(
  '/providers/:id/reject',
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Rejeita um prestador'
    #swagger.description = 'Rejeita um prestador que está com o cadastro pendente.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Prestador rejeitado com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Transição de status não permitida.' }
  */
  criarRotaAtualizacaoStatus('REJECTED'),
)
rotas.patch(
  '/providers/:id/suspend',
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Suspende um prestador'
    #swagger.description = 'Suspende um prestador que está aprovado.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Prestador suspenso com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Transição de status não permitida.' }
  */
  criarRotaAtualizacaoStatus('SUSPENDED'),
)
rotas.patch(
  '/providers/:id/ban',
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Bane um prestador'
    #swagger.description = 'Bane um prestador pendente, aprovado ou suspenso.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Prestador banido com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Transição de status não permitida.' }
  */
  criarRotaAtualizacaoStatus('BANNED'),
)

rotas.patch('/providers/:id/featured', async (req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Altera o destaque de um prestador'
    #swagger.description = 'Adiciona ou remove um prestador aprovado da lista de destaques.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['destaque'],
            properties: { destaque: { type: 'boolean', example: true } }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Destaque atualizado com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Prestador ainda não foi aprovado.' }
  */
  const validacaoId = schemaIdPrestador.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })
  const validacaoDados = schemaDestaque.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const prestador = await obterPrestador(validacaoId.data)
  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado.' })
  if (prestador.approvalStatus !== 'APPROVED') {
    return res.status(409).json({ error: 'Apenas prestadores aprovados podem receber destaque.' })
  }

  const prestadorAtualizado = await prisma.providerProfile.update({
    where: { id: prestador.id },
    data: { isFeatured: validacaoDados.data.destaque },
    include: inclusaoPrestador,
  })
  res.json({ prestador: prestadorAtualizado })
})

rotas.get('/reviews', async (_req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Lista todas as avaliações'
    #swagger.description = 'Retorna todas as avaliações para acompanhamento administrativo.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Avaliações retornadas com sucesso.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const avaliacoes = await prisma.review.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      provider: { include: { user: { select: { id: true, name: true, email: true } } } },
      request: { select: { id: true, status: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ avaliacoes })
})

rotas.get('/requests', async (_req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Lista todas as solicitações'
    #swagger.description = 'Retorna todas as solicitações para acompanhamento administrativo.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Solicitações retornadas com sucesso.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const solicitacoes = await prisma.serviceRequest.findMany({
    include: inclusaoSolicitacao,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ solicitacoes })
})

rotas.get('/clients', async (_req, res) => {
  /*
    #swagger.tags = ['Administração']
    #swagger.summary = 'Lista todos os clientes'
    #swagger.description = 'Retorna todos os clientes e as quantidades de solicitações e avaliações.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Clientes retornados com sucesso.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const clientes = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      _count: { select: { requests: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ clientes })
})

export default rotas
