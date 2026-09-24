import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    title: 'Me Socorre API',
    description: 'Documentação da API da plataforma de prestação de serviços Me Socorre.',
    version: '1.0.0',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Ambiente local' }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro e autenticação de usuários.' },
    { name: 'Clientes', description: 'Consulta e atualização de clientes.' },
    { name: 'Prestadores', description: 'Consulta e atualização de prestadores.' },
    { name: 'Categorias', description: 'Gerenciamento das categorias de serviço.' },
    { name: 'Solicitações', description: 'Gerenciamento das solicitações de serviço.' },
    { name: 'Avaliações', description: 'Avaliações realizadas pelos clientes.' },
    { name: 'Administração', description: 'Operações exclusivas de administradores.' },
    { name: 'Sistema', description: 'Informações de disponibilidade da API.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o token JWT retornado pelo endpoint de login.',
      },
    },
  },
}

const outputFile = './swagger-output.json'
const routes = ['./src/server.ts']

await swaggerAutogen({
  openapi: '3.0.0',
  language: 'pt-BR',
  autoBody: false,
  autoHeaders: false,
})(outputFile, routes, doc)
