import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requerAutenticacao } from '../middlewares/auth.middleware'
import { requerPerfil } from '../middlewares/perfil.middleware'

const rotas = Router()

const schemaIdUsuario = z.string().uuid('ID de usuário inválido.')
const schemaAtualizacaoCliente = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').optional(),
  telefone: z.string().min(8).max(30).nullable().optional(),
  endereco: z.string().min(5).nullable().optional(),
})

const dadosPublicosCliente = (cliente: {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
}) => ({
  id: cliente.id,
  nome: cliente.name,
  email: cliente.email,
  telefone: cliente.phone,
  endereco: cliente.address,
  criadoEm: cliente.createdAt,
  atualizadoEm: cliente.updatedAt,
})

const validarAcessoCliente = (idCliente: string, idUsuario: string, perfil: string) =>
  perfil === 'ADMIN' || idCliente === idUsuario

rotas.get('/:id', requerAutenticacao, requerPerfil('CLIENT', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Clientes']
    #swagger.summary = 'Consulta um cliente'
    #swagger.description = 'Retorna o próprio perfil do cliente. Administradores podem consultar qualquer cliente.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do usuário cliente.' }
    #swagger.responses[200] = { description: 'Cliente encontrado.' }
    #swagger.responses[400] = { description: 'ID inválido.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para consultar o cliente.' }
    #swagger.responses[404] = { description: 'Cliente não encontrado.' }
  */
  const validacaoId = schemaIdUsuario.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  if (!validarAcessoCliente(validacaoId.data, req.autenticacao!.idUsuario, req.autenticacao!.perfil)) {
    return res.status(403).json({ error: 'Você não tem permissão para acessar este perfil.' })
  }

  const cliente = await prisma.user.findFirst({
    where: { id: validacaoId.data, role: 'CLIENT' },
  })

  if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' })
  res.json({ cliente: dadosPublicosCliente(cliente) })
})

rotas.put('/:id', requerAutenticacao, requerPerfil('CLIENT', 'ADMIN'), async (req, res) => {
  /*
    #swagger.tags = ['Clientes']
    #swagger.summary = 'Atualiza um cliente'
    #swagger.description = 'Atualiza os dados do próprio cliente. Administradores podem atualizar qualquer cliente.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do usuário cliente.' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              nome: { type: 'string', minLength: 2, example: 'João da Silva' },
              telefone: { type: 'string', nullable: true, minLength: 8, maxLength: 30, example: '51999999999' },
              endereco: { type: 'string', nullable: true, minLength: 5, example: 'Rua das Flores, 100' }
            }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Cliente atualizado com sucesso.' }
    #swagger.responses[400] = { description: 'ID ou dados de atualização inválidos.' }
    #swagger.responses[401] = { description: 'Token não informado, inválido ou expirado.' }
    #swagger.responses[403] = { description: 'Usuário sem permissão para atualizar o cliente.' }
    #swagger.responses[404] = { description: 'Cliente não encontrado.' }
  */
  const validacaoId = schemaIdUsuario.safeParse(req.params.id)
  if (!validacaoId.success) return res.status(400).json({ error: validacaoId.error.flatten() })

  if (!validarAcessoCliente(validacaoId.data, req.autenticacao!.idUsuario, req.autenticacao!.perfil)) {
    return res.status(403).json({ error: 'Você não tem permissão para editar este perfil.' })
  }

  const validacaoDados = schemaAtualizacaoCliente.safeParse(req.body)
  if (!validacaoDados.success) return res.status(400).json({ error: validacaoDados.error.flatten() })

  const clienteExistente = await prisma.user.findFirst({
    where: { id: validacaoId.data, role: 'CLIENT' },
  })
  if (!clienteExistente) return res.status(404).json({ error: 'Cliente não encontrado.' })

  const dados = validacaoDados.data
  const cliente = await prisma.user.update({
    where: { id: validacaoId.data },
    data: {
      ...(dados.nome !== undefined ? { name: dados.nome } : {}),
      ...(dados.telefone !== undefined ? { phone: dados.telefone } : {}),
      ...(dados.endereco !== undefined ? { address: dados.endereco } : {}),
    },
  })

  res.json({ cliente: dadosPublicosCliente(cliente) })
})

export default rotas
