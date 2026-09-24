import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requerAutenticacao } from '../middlewares/auth.middleware'
import { requerPerfil } from '../middlewares/perfil.middleware'
import { obterResumoPrestador } from '../services/gemini.service'

const rotas = Router()

const schemaIdPrestador = z.string().uuid('ID de prestador inválido.')
const schemaAtualizacaoPrestador = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().min(8).max(30).nullable().optional(),
  endereco: z.string().min(5).nullable().optional(),
  idCategoria: z.coerce.number().int().positive().optional(),
})
const schemaDisponibilidade = z.object({
  disponivel: z.boolean(),
})
const inclusaoPublicaPrestador = {
  user: { select: { id: true, name: true, phone: true } },
  category: true,
}

const validarAcessoPrestador = (idPrestador: string, idUsuario: string, perfil: string, idUsuarioPrestador: string) =>
  perfil === 'ADMIN' || (perfil === 'PROVIDER' && idUsuario === idUsuarioPrestador)

rotas.get('/', async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Lista os prestadores disponíveis'
    #swagger.description = 'Retorna prestadores aprovados e disponíveis, com filtros opcionais.'
    #swagger.parameters['search'] = { in: 'query', required: false, schema: { type: 'string' }, description: 'Busca por nome, categoria ou endereço.' }
    #swagger.parameters['categoryId'] = { in: 'query', required: false, schema: { type: 'integer', minimum: 1 }, description: 'Filtra pelo ID da categoria.' }
    #swagger.responses[200] = { description: 'Prestadores retornados com sucesso.' }
  */
  const termoBusca = typeof req.query.search === 'string' ? req.query.search : undefined
  const idCategoria = Number(req.query.categoryId)

  const prestadores = await prisma.providerProfile.findMany({
    where: {
      approvalStatus: 'APPROVED',
      isAvailable: true,
      ...(Number.isInteger(idCategoria) && idCategoria > 0 ? { categoryId: idCategoria } : {}),
      ...(termoBusca ? {
        OR: [
          { user: { name: { contains: termoBusca, mode: 'insensitive' } } },
          { category: { name: { contains: termoBusca, mode: 'insensitive' } } },
          { address: { contains: termoBusca, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: inclusaoPublicaPrestador,
    orderBy: [{ isFeatured: 'desc' }, { ratingAverage: 'desc' }],
  })

  res.json(prestadores)
})

rotas.get('/:id/reviews', async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Lista as avaliações de um prestador'
    #swagger.description = 'Retorna a média e as avaliações de um prestador aprovado.'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Avaliações retornadas com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
  */
  const validacaoId = schemaIdPrestador.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const prestador = await prisma.providerProfile.findFirst({
    where: { id: validacaoId.data, approvalStatus: 'APPROVED' },
  })
  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado.' })

  const avaliacoes = await prisma.review.findMany({
    where: { providerId: prestador.id },
    select: { id: true, rating: true, comment: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ avaliacaoMedia: prestador.ratingAverage, avaliacoes })
})

rotas.get('/:id/review-summary', async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Gera o resumo das avaliações'
    #swagger.description = 'Gera com IA um resumo das avaliações de um prestador aprovado.'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Resumo retornado com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[503] = { description: 'Serviço de geração do resumo indisponível.' }
  */
  const validacaoId = schemaIdPrestador.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const prestador = await prisma.providerProfile.findFirst({
    where: { id: validacaoId.data, approvalStatus: 'APPROVED' },
    select: { id: true },
  })
  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado.' })

  try {
    const resultado = await obterResumoPrestador(prestador.id)
    res.json({ resumoGeradoPorIa: resultado?.resumo ?? null, ...resultado })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Não foi possível gerar o resumo por IA.'
    res.status(503).json({ error: mensagem })
  }
})

rotas.get('/:id', async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Consulta um prestador'
    #swagger.description = 'Retorna o perfil público de um prestador aprovado.'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.responses[200] = { description: 'Prestador encontrado.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
  */
  const prestador = await prisma.providerProfile.findFirst({
    where: { id: req.params.id, approvalStatus: 'APPROVED' },
    include: inclusaoPublicaPrestador,
  })

  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado' })
  res.json(prestador)
})

rotas.put('/:id', requerAutenticacao, requerPerfil('PROVIDER', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Atualiza um prestador'
    #swagger.description = 'Atualiza o próprio perfil do prestador. Administradores podem atualizar qualquer prestador.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              nome: { type: 'string', minLength: 2, example: 'Maria Souza' },
              telefone: { type: 'string', nullable: true, minLength: 8, maxLength: 30, example: '51988888888' },
              endereco: { type: 'string', nullable: true, minLength: 5, example: 'Av. Central, 250' },
              idCategoria: { type: 'integer', minimum: 1, example: 1 }
            }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Prestador atualizado com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para atualizar o prestador.' }
    #swagger.responses[404] = { description: 'Prestador ou categoria não encontrado.' }
  */
  const validacaoId = schemaIdPrestador.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const validacaoDados = schemaAtualizacaoPrestador.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const prestadorExistente = await prisma.providerProfile.findUnique({
    where: { id: validacaoId.data },
    include: { user: true },
  })
  if (!prestadorExistente) return res.status(404).json({ error: 'Prestador não encontrado.' })

  if (!validarAcessoPrestador(
    prestadorExistente.id,
    req.autenticacao!.idUsuario,
    req.autenticacao!.perfil,
    prestadorExistente.userId,
  )) {
    return res.status(403).json({ error: 'Você não tem permissão para editar este perfil.' })
  }

  const dados = validacaoDados.data
  if (dados.idCategoria !== undefined) {
    const categoria = await prisma.category.findUnique({ where: { id: dados.idCategoria } })
    if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' })
  }

  const prestador = await prisma.$transaction(async (transacao) => {
    await transacao.user.update({
      where: { id: prestadorExistente.userId },
      data: {
        ...(dados.nome !== undefined ? { name: dados.nome } : {}),
        ...(dados.telefone !== undefined ? { phone: dados.telefone } : {}),
      },
    })

    return transacao.providerProfile.update({
      where: { id: prestadorExistente.id },
      data: {
        ...(dados.endereco !== undefined ? { address: dados.endereco } : {}),
        ...(dados.idCategoria !== undefined ? { categoryId: dados.idCategoria } : {}),
      },
      include: inclusaoPublicaPrestador,
    })
  })

  res.json(prestador)
})

rotas.patch('/:id/status', requerAutenticacao, requerPerfil('PROVIDER', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Prestadores']
    #swagger.summary = 'Altera a disponibilidade do prestador'
    #swagger.description = 'Ativa ou desativa a disponibilidade de um prestador aprovado.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do perfil do prestador.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['disponivel'],
            properties: { disponivel: { type: 'boolean', example: true } }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Disponibilidade atualizada com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para alterar a disponibilidade.' }
    #swagger.responses[404] = { description: 'Prestador não encontrado.' }
    #swagger.responses[409] = { description: 'Prestador ainda não foi aprovado.' }
  */
  const validacaoId = schemaIdPrestador.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const validacaoDados = schemaDisponibilidade.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const prestador = await prisma.providerProfile.findUnique({ where: { id: validacaoId.data } })
  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado.' })

  if (!validarAcessoPrestador(prestador.id, req.autenticacao!.idUsuario, req.autenticacao!.perfil, prestador.userId)) {
    return res.status(403).json({ error: 'Você não tem permissão para alterar a disponibilidade.' })
  }

  if (prestador.approvalStatus !== 'APPROVED') {
    return res.status(409).json({ error: 'Apenas prestadores aprovados podem alterar a disponibilidade.' })
  }

  const prestadorAtualizado = await prisma.providerProfile.update({
    where: { id: prestador.id },
    data: { isAvailable: validacaoDados.data.disponivel },
  })
  res.json(prestadorAtualizado)
})

export default rotas
