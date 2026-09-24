import 'dotenv/config'
import express from 'express'
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger-output.json";
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import rotasAdmin from './routes/admin'
import rotasAutenticacao from './routes/autenticacao'
import rotasAvaliacoes from './routes/avaliacoes'
import rotasCategorias from './routes/categories'
import rotasClientes from './routes/clientes'
import rotasPrestadores from './routes/providers'
import rotasSolicitacoes from './routes/solicitacoes'
import { rotaNaoEncontrada, tratarErro } from './middlewares/erro.middleware'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const origensPermitidas = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean)

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); //swagger-ui-express

app.use(express.json({ limit: '1mb' }))
app.use(cors({
  origin: (origem, permitir) => {
    if (!origem || origensPermitidas.includes(origem)) return permitir(null, true)
    return permitir(null, false)
  },
}))

const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
})

const limiteAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' },
})

app.use(limiteGeral)

app.use('/auth', limiteAutenticacao, rotasAutenticacao)
app.use('/admin', rotasAdmin)
app.use('/reviews', rotasAvaliacoes)
app.use('/categories', rotasCategorias)
app.use('/clients', rotasClientes)
app.use('/providers', rotasPrestadores)
app.use('/requests', rotasSolicitacoes)

app.get('/', (_req, res) => {
  /*
    #swagger.tags = ['Sistema']
    #swagger.summary = 'Apresenta a API'
    #swagger.description = 'Retorna o nome da API e seu estado atual.'
    #swagger.responses[200] = { description: 'API disponível.' }
  */
  res.json({ name: 'Me Socorre API', status: 'ok' })
})

app.get('/health', (_req, res) => {
  /*
    #swagger.tags = ['Sistema']
    #swagger.summary = 'Verifica a disponibilidade da API'
    #swagger.description = 'Endpoint simples para monitoramento de saúde da aplicação.'
    #swagger.responses[200] = { description: 'API disponível.' }
  */
  res.json({ status: 'ok' })
})

app.use(rotaNaoEncontrada)
app.use(tratarErro)

export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`)
  })
}
