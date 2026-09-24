import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requerAutenticacao } from '../middlewares/auth.middleware'
import { requerPerfil } from '../middlewares/perfil.middleware'

const rotas = Router()

const schemaIdSolicitacao = z.coerce.number().int().positive('ID de solicitação inválido.')
const schemaCriacaoSolicitacao = z
  .object({
    idCategoria: z.coerce.number().int().positive(),
    idPrestador: z.string().uuid('ID de prestador inválido.'),
    descricao: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres.'),
    endereco: z.string().min(5),
    tipoAtendimento: z.enum(['IMMEDIATE', 'SCHEDULED']).default('IMMEDIATE'),
    dataAgendamento: z.coerce.date().optional(),
    fotoUrl: z.string().url().optional(),
  })
  .superRefine((dados, contexto) => {
    if (dados.tipoAtendimento === 'SCHEDULED' && !dados.dataAgendamento) {
      contexto.addIssue({
        code: 'custom',
        path: ['dataAgendamento'],
        message: 'Data de agendamento é obrigatória para atendimento agendado.',
      })
    }

    if (dados.tipoAtendimento === 'IMMEDIATE' && dados.dataAgendamento) {
      contexto.addIssue({
        code: 'custom',
        path: ['dataAgendamento'],
        message: 'Atendimento imediato não deve possuir data de agendamento.',
      })
    }

    if (dados.dataAgendamento && dados.dataAgendamento <= new Date()) {
      contexto.addIssue({
        code: 'custom',
        path: ['dataAgendamento'],
        message: 'A data de agendamento deve estar no futuro.',
      })
    }
  })

const schemaAtualizacaoStatus = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
})
const schemaValorFinal = z.object({
  valorFinal: z.coerce.number().positive(),
})
const schemaConsulta = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

const inclusaoSolicitacao = {
  category: true,
  client: { select: { id: true, name: true, phone: true } },
  provider: {
    include: {
      user: { select: { id: true, name: true, phone: true } },
      category: true,
    },
  },
}

const obterPrestadorDoUsuario = (idUsuario: string) =>
  prisma.providerProfile.findUnique({ where: { userId: idUsuario } })

rotas.post('/', requerAutenticacao, requerPerfil('CLIENT'), async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Cria uma solicitação de serviço'
    #swagger.description = 'Cria uma solicitação para um prestador aprovado, disponível e pertencente à categoria informada.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['idCategoria', 'idPrestador', 'descricao', 'endereco'],
            properties: {
              idCategoria: { type: 'integer', minimum: 1, example: 1 },
              idPrestador: { type: 'string', format: 'uuid', example: '6c0fce3a-510f-4ba7-a5fd-2236ed3fc08d' },
              descricao: { type: 'string', minLength: 10, example: 'Tomada da cozinha parou de funcionar.' },
              endereco: { type: 'string', minLength: 5, example: 'Rua das Flores, 100' },
              tipoAtendimento: { type: 'string', enum: ['IMMEDIATE', 'SCHEDULED'], default: 'IMMEDIATE' },
              dataAgendamento: { type: 'string', format: 'date-time', description: 'Obrigatória quando o atendimento for agendado.' },
              fotoUrl: { type: 'string', format: 'uri', example: 'https://exemplo.com/foto.jpg' }
            }
          }
        }
      }
    }
    #swagger.responses[201] = { description: 'Solicitação criada com sucesso.' }
    #swagger.responses[400] = { description: 'Dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para clientes.' }
    #swagger.responses[404] = { description: 'Categoria não encontrada.' }
    #swagger.responses[409] = { description: 'Prestador indisponível ou de outra categoria.' }
  */
  const validacao = schemaCriacaoSolicitacao.safeParse(req.body)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const prestador = await prisma.providerProfile.findFirst({
    where: {
      id: validacao.data.idPrestador,
      categoryId: validacao.data.idCategoria,
      approvalStatus: 'APPROVED',
      isAvailable: true,
    },
  })
  if (!prestador) return res.status(409).json({ error: 'Prestador indisponível ou de outra categoria.' })

  const categoria = await prisma.category.findUnique({ where: { id: validacao.data.idCategoria } })
  if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const solicitacao = await prisma.serviceRequest.create({
    data: {
      clientId: req.autenticacao!.idUsuario,
      providerId: prestador.id,
      categoryId: validacao.data.idCategoria,
      description: validacao.data.descricao,
      address: validacao.data.endereco,
      serviceType: validacao.data.tipoAtendimento,
      scheduledAt: validacao.data.dataAgendamento,
      photoUrl: validacao.data.fotoUrl,
    },
    include: inclusaoSolicitacao,
  })

  res.status(201).json({ solicitacao })
})

rotas.get('/', requerAutenticacao, async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Lista as solicitações'
    #swagger.description = 'Lista as solicitações visíveis ao usuário autenticado, com filtro opcional por status.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['status'] = { in: 'query', required: false, schema: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }, description: 'Status da solicitação.' }
    #swagger.responses[200] = { description: 'Solicitações retornadas com sucesso.' }
    #swagger.responses[400] = { description: 'Filtro de status inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Prestador ainda não aprovado.' }
  */
  const validacaoConsulta = schemaConsulta.safeParse(req.query)
  if (!validacaoConsulta.success) return res.status(400).json({ error: validacaoConsulta.error.flatten() })

  const filtroStatus = validacaoConsulta.data.status ? { status: validacaoConsulta.data.status } : {}
  const perfil = req.autenticacao!.perfil
  let filtro: Record<string, unknown>

  if (perfil === 'CLIENT') {
    filtro = { clientId: req.autenticacao!.idUsuario, ...filtroStatus }
  } else if (perfil === 'PROVIDER') {
    const prestador = await obterPrestadorDoUsuario(req.autenticacao!.idUsuario)
    if (!prestador || prestador.approvalStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Prestador não aprovado.' })
    }

    filtro = { providerId: prestador.id, ...filtroStatus }
  } else {
    filtro = filtroStatus
  }

  const solicitacoes = await prisma.serviceRequest.findMany({
    where: filtro,
    include: inclusaoSolicitacao,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ solicitacoes })
})

rotas.get('/:id', requerAutenticacao, async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Consulta uma solicitação'
    #swagger.description = 'Retorna uma solicitação quando ela estiver acessível ao usuário autenticado.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da solicitação.' }
    #swagger.responses[200] = { description: 'Solicitação encontrada.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para consultar a solicitação.' }
    #swagger.responses[404] = { description: 'Solicitação não encontrada.' }
  */
  const validacaoId = schemaIdSolicitacao.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const solicitacao = await prisma.serviceRequest.findUnique({
    where: { id: validacaoId.data },
    include: inclusaoSolicitacao,
  })
  if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada.' })

  const autenticacao = req.autenticacao!
  if (autenticacao.perfil === 'CLIENT' && solicitacao.clientId !== autenticacao.idUsuario) {
    return res.status(403).json({ error: 'Você não tem permissão para acessar esta solicitação.' })
  }

  if (autenticacao.perfil === 'PROVIDER') {
    const prestador = await obterPrestadorDoUsuario(autenticacao.idUsuario)
    const podeVisualizar =
      prestador &&
      prestador.approvalStatus === 'APPROVED' &&
      solicitacao.providerId === prestador.id

    if (!podeVisualizar) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta solicitação.' })
    }
  }

  res.json({ solicitacao })
})

rotas.patch('/:id/provider', requerAutenticacao, requerPerfil('PROVIDER'), async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Aceita uma solicitação'
    #swagger.description = 'Permite que o prestador vinculado aceite uma solicitação pendente.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da solicitação.' }
    #swagger.responses[200] = { description: 'Solicitação aceita com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Prestador não aprovado ou indisponível.' }
    #swagger.responses[409] = { description: 'Solicitação indisponível para aceite.' }
  */
  const validacaoId = schemaIdSolicitacao.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const prestador = await obterPrestadorDoUsuario(req.autenticacao!.idUsuario)
  if (!prestador || prestador.approvalStatus !== 'APPROVED' || !prestador.isAvailable) {
    return res.status(403).json({ error: 'Prestador precisa estar aprovado e disponível para aceitar solicitações.' })
  }

  const quantidadeAtualizada = await prisma.serviceRequest.updateMany({
    where: {
      id: validacaoId.data,
      providerId: prestador.id,
      status: 'PENDING',
    },
    data: { status: 'ACCEPTED' },
  })

  if (quantidadeAtualizada.count === 0) {
    return res.status(409).json({ error: 'Solicitação indisponível para aceite.' })
  }

  const solicitacao = await prisma.serviceRequest.findUnique({
    where: { id: validacaoId.data },
    include: inclusaoSolicitacao,
  })
  res.json({ solicitacao })
})

rotas.patch('/:id/status', requerAutenticacao, requerPerfil('CLIENT', 'PROVIDER', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Altera o status de uma solicitação'
    #swagger.description = 'Altera o status conforme as transições permitidas para o perfil autenticado.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da solicitação.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'IN_PROGRESS' } }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Status atualizado com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou status inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para alterar a solicitação.' }
    #swagger.responses[404] = { description: 'Solicitação não encontrada.' }
    #swagger.responses[409] = { description: 'Transição de status não permitida.' }
  */
  const validacaoId = schemaIdSolicitacao.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const validacaoDados = schemaAtualizacaoStatus.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const solicitacao = await prisma.serviceRequest.findUnique({ where: { id: validacaoId.data } })
  if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada.' })

  const autenticacao = req.autenticacao!
  if (autenticacao.perfil === 'CLIENT') {
    if (solicitacao.clientId !== autenticacao.idUsuario) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar esta solicitação.' })
    }
    if (validacaoDados.data.status !== 'CANCELLED' || solicitacao.status !== 'PENDING') {
      return res.status(409).json({ error: 'Cliente pode cancelar apenas solicitações pendentes.' })
    }
  }

  if (autenticacao.perfil === 'PROVIDER') {
    const prestador = await obterPrestadorDoUsuario(autenticacao.idUsuario)
    if (!prestador || solicitacao.providerId !== prestador.id) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar esta solicitação.' })
    }

    const transicaoValida =
      (solicitacao.status === 'ACCEPTED' && validacaoDados.data.status === 'IN_PROGRESS') ||
      (solicitacao.status === 'IN_PROGRESS' && validacaoDados.data.status === 'COMPLETED')

    if (!transicaoValida) {
      return res.status(409).json({ error: 'Transição de status inválida.' })
    }
  }

  const solicitacaoAtualizada = await prisma.serviceRequest.update({
    where: { id: solicitacao.id },
    data: { status: validacaoDados.data.status },
    include: inclusaoSolicitacao,
  })
  res.json({ solicitacao: solicitacaoAtualizada })
})

rotas.patch('/:id/value', requerAutenticacao, requerPerfil('PROVIDER', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Solicitações']
    #swagger.summary = 'Informa o valor final do serviço'
    #swagger.description = 'Registra o valor final de uma solicitação em andamento ou concluída.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da solicitação.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['valorFinal'],
            properties: { valorFinal: { type: 'number', format: 'double', minimum: 0, exclusiveMinimum: true, example: 150.50 } }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Valor final atualizado com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou valor inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para informar o valor.' }
    #swagger.responses[404] = { description: 'Solicitação não encontrada.' }
  */
  const validacaoId = schemaIdSolicitacao.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const validacaoDados = schemaValorFinal.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const solicitacao = await prisma.serviceRequest.findUnique({ where: { id: validacaoId.data } })
  if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada.' })

  if (req.autenticacao!.perfil === 'PROVIDER') {
    const prestador = await obterPrestadorDoUsuario(req.autenticacao!.idUsuario)
    const podeInformarValor =
      prestador &&
      solicitacao.providerId === prestador.id &&
      ['IN_PROGRESS', 'COMPLETED'].includes(solicitacao.status)

    if (!podeInformarValor) {
      return res.status(403).json({ error: 'Você não pode informar o valor desta solicitação.' })
    }
  }

  const solicitacaoAtualizada = await prisma.serviceRequest.update({
    where: { id: solicitacao.id },
    data: { finalPrice: validacaoDados.data.valorFinal },
    include: inclusaoSolicitacao,
  })
  res.json({ solicitacao: solicitacaoAtualizada })
})

export default rotas
