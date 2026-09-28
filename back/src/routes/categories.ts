import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requerAutenticacao } from '../middlewares/auth.middleware'
import { requerPerfil } from '../middlewares/perfil.middleware'

const rotas = Router()
const schemaIdCategoria = z.coerce.number().int().positive('ID de categoria inválido.')
const schemaCategoria = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
})

rotas.get('/', async (_req, res) => {
  /*
    #swagger.tags = ['Categorias']
    #swagger.summary = 'Lista as categorias'
    #swagger.description = 'Retorna todas as categorias de serviço em ordem alfabética.'
    #swagger.responses[200] = { description: 'Categorias retornadas com sucesso.' }
  */
  const categorias = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  res.json(categorias)
})

rotas.post('/', requerAutenticacao, requerPerfil('ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Categorias']
    #swagger.summary = 'Cria uma categoria'
    #swagger.description = 'Cria uma categoria de serviço. Operação exclusiva de administradores.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 2, example: 'Eletricista' },
              description: { type: 'string', example: 'Serviços elétricos residenciais e comerciais.' }
            }
          }
        }
      }
    }
    #swagger.responses[201] = { description: 'Categoria criada com sucesso.' }
    #swagger.responses[400] = { description: 'Dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
  */
  const validacao = schemaCategoria.safeParse(req.body)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const categoria = await prisma.category.create({ data: validacao.data })
  res.status(201).json(categoria)
})

rotas.put('/:id', requerAutenticacao, requerPerfil('ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Categorias']
    #swagger.summary = 'Atualiza uma categoria'
    #swagger.description = 'Atualiza uma categoria de serviço. Operação exclusiva de administradores.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da categoria.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 2, example: 'Eletricista' },
              description: { type: 'string', example: 'Serviços elétricos residenciais e comerciais.' }
            }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Categoria atualizada com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou dados inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Categoria não encontrada.' }
  */
  const validacaoId = schemaIdCategoria.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const validacaoDados = schemaCategoria.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const categoriaExistente = await prisma.category.findUnique({ where: { id: validacaoId.data } })
  if (!categoriaExistente) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const categoria = await prisma.category.update({
    where: { id: validacaoId.data },
    data: validacaoDados.data,
  })
  res.json(categoria)
})

rotas.delete('/:id', requerAutenticacao, requerPerfil('ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Categorias']
    #swagger.summary = 'Exclui uma categoria'
    #swagger.description = 'Exclui uma categoria sem prestadores ou solicitações vinculados. Operação exclusiva de administradores.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID da categoria.' }
    #swagger.responses[204] = { description: 'Categoria excluída com sucesso.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Acesso permitido apenas para administradores.' }
    #swagger.responses[404] = { description: 'Categoria não encontrada.' }
    #swagger.responses[409] = { description: 'Categoria possui vínculos e não pode ser excluída.' }
  */
  const validacaoId = schemaIdCategoria.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  const categoriaExistente = await prisma.category.findUnique({ where: { id: validacaoId.data } })
  if (!categoriaExistente) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const [quantidadePrestadores, quantidadeSolicitacoes] = await Promise.all([
    prisma.providerProfile.count({ where: { categoryId: validacaoId.data } }),
    prisma.serviceRequest.count({ where: { categoryId: validacaoId.data } }),
  ])

  if (quantidadePrestadores > 0 || quantidadeSolicitacoes > 0) {
    return res.status(409).json({
      error: 'Categoria não pode ser excluída porque possui prestadores ou solicitações vinculados.',
    })
  }

  await prisma.category.delete({ where: { id: validacaoId.data } })
  res.status(204).send()
})

export default rotas
