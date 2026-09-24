import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { compararSenha, gerarHashSenha, gerarTokenAcesso } from '../utils/auth'

const rotas = Router()

const schemaDadosUsuario = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(4, 'Senha deve ter ao menos 4 caracteres.'),
  telefone: z.string().min(8).max(30).optional(),
  endereco: z.string().min(5).optional(),
})

const schemaCadastroPrestador = schemaDadosUsuario.extend({
  idCategoria: z.coerce.number().int().positive(),
})

const schemaLogin = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(1, 'Senha é obrigatória.'),
})

const dadosPublicosUsuario = (usuario: {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN'
}) => ({
  id: usuario.id,
  nome: usuario.name,
  email: usuario.email,
  perfil: usuario.role,
})

rotas.post('/client/register', async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Cadastra um cliente'
    #swagger.description = 'Cria uma conta com o perfil de cliente.'
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['nome', 'email', 'senha'],
            properties: {
              nome: { type: 'string', minLength: 2, example: 'João da Silva' },
              email: { type: 'string', format: 'email', example: 'joao@email.com' },
              senha: { type: 'string', format: 'password', minLength: 4, example: '123456' },
              telefone: { type: 'string', minLength: 8, maxLength: 30, example: '51999999999' },
              endereco: { type: 'string', minLength: 5, example: 'Rua das Flores, 100' }
            }
          }
        }
      }
    }
    #swagger.responses[201] = { description: 'Cliente cadastrado com sucesso.' }
    #swagger.responses[400] = { description: 'Dados de cadastro inválidos.' }
    #swagger.responses[409] = { description: 'E-mail já cadastrado.' }
  */
  const validacao = schemaDadosUsuario.safeParse(req.body)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const { nome, email, senha, telefone, endereco } = validacao.data
  const emailNormalizado = email.toLowerCase()

  const usuarioExistente = await prisma.user.findUnique({ where: { email: emailNormalizado } })
  if (usuarioExistente) return res.status(409).json({ error: 'E-mail já cadastrado.' })

  const senhaProtegida = await gerarHashSenha(senha)
  const usuario = await prisma.user.create({
    data: {
      name: nome,
      email: emailNormalizado,
      password: senhaProtegida,
      phone: telefone,
      address: endereco,
      role: 'CLIENT',
    },
  })

  res.status(201).json({ usuario: dadosPublicosUsuario(usuario) })
})

rotas.post('/provider/register', async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Cadastra um prestador'
    #swagger.description = 'Cria uma conta de prestador vinculada a uma categoria. O cadastro inicia pendente de aprovação.'
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['nome', 'email', 'senha', 'idCategoria'],
            properties: {
              nome: { type: 'string', minLength: 2, example: 'Maria Souza' },
              email: { type: 'string', format: 'email', example: 'maria@email.com' },
              senha: { type: 'string', format: 'password', minLength: 4, example: '123456' },
              telefone: { type: 'string', minLength: 8, maxLength: 30, example: '51988888888' },
              endereco: { type: 'string', minLength: 5, example: 'Av. Central, 250' },
              idCategoria: { type: 'integer', minimum: 1, example: 1 }
            }
          }
        }
      }
    }
    #swagger.responses[201] = { description: 'Prestador cadastrado com sucesso.' }
    #swagger.responses[400] = { description: 'Dados de cadastro inválidos.' }
    #swagger.responses[404] = { description: 'Categoria não encontrada.' }
    #swagger.responses[409] = { description: 'E-mail já cadastrado.' }
  */
  const validacao = schemaCadastroPrestador.safeParse(req.body)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const { nome, email, senha, telefone, endereco, idCategoria } = validacao.data
  const emailNormalizado = email.toLowerCase()

  const [usuarioExistente, categoria] = await Promise.all([
    prisma.user.findUnique({ where: { email: emailNormalizado } }),
    prisma.category.findUnique({ where: { id: idCategoria } }),
  ])

  if (usuarioExistente) return res.status(409).json({ error: 'E-mail já cadastrado.' })
  if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const senhaProtegida = await gerarHashSenha(senha)
  const prestador = await prisma.$transaction(async (transacao) => {
    const usuario = await transacao.user.create({
      data: {
        name: nome,
        email: emailNormalizado,
        password: senhaProtegida,
        phone: telefone,
        address: endereco,
        role: 'PROVIDER',
      },
    })

    return transacao.providerProfile.create({
      data: {
        userId: usuario.id,
        categoryId: idCategoria,
        address: endereco,
      },
      include: { user: true, category: true },
    })
  })

  res.status(201).json({
    usuario: dadosPublicosUsuario(prestador.user),
    prestador: {
      id: prestador.id,
      statusAprovacao: prestador.approvalStatus,
      categoria: prestador.category,
    },
  })
})

rotas.post('/login', async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Autentica um usuário'
    #swagger.description = 'Valida as credenciais e retorna o token JWT usado nas rotas protegidas.'
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'senha'],
            properties: {
              email: { type: 'string', format: 'email', example: 'joao@email.com' },
              senha: { type: 'string', format: 'password', example: '123456' }
            }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Login realizado com sucesso.' }
    #swagger.responses[400] = { description: 'Dados de login inválidos.' }
    #swagger.responses[401] = { description: 'E-mail ou senha inválidos.' }
  */
  const validacao = schemaLogin.safeParse(req.body)
  if (!validacao.success) return res.status(400).json({ error: validacao.error.flatten() })

  const emailNormalizado = validacao.data.email.toLowerCase()
  const usuario = await prisma.user.findUnique({
    where: { email: emailNormalizado },
    include: { provider: true },
  })

  if (!usuario || !(await compararSenha(validacao.data.senha, usuario.password))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' })
  }

  const token = gerarTokenAcesso({ idUsuario: usuario.id, perfil: usuario.role })
  res.json({
    token,
    usuario: dadosPublicosUsuario(usuario),
    prestador: usuario.provider
      ? { id: usuario.provider.id, statusAprovacao: usuario.provider.approvalStatus }
      : undefined,
  })
})

export default rotas
