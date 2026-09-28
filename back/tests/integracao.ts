import { prisma } from '../lib/prisma'
import { obterResumoPrestador } from '../src/services/gemini.service'
import { gerarHashSenha } from '../src/utils/auth'

process.env.NODE_ENV = 'test'
process.env.PORT = process.env.TEST_PORT ?? '3101'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'chave-temporaria-de-teste-nao-utilizar-em-producao'

const porta = Number(process.env.PORT)
const urlBase = `http://127.0.0.1:${porta}`
const sufixo = `teste-${Date.now()}`
const emails = {
  administrador: `admin-${sufixo}@teste.local`,
  cliente: `cliente-${sufixo}@teste.local`,
  prestador: `prestador-${sufixo}@teste.local`,
  prestadorAlternativo: `prestador-alternativo-${sufixo}@teste.local`,
}

type Resposta = { status: number; corpo: any; headers: Headers }

const verificar: (condicao: unknown, mensagem: string) => void = (condicao, mensagem) => {
  if (!condicao) throw new Error(mensagem)
}

const requisicao = async (caminho: string, opcoes: RequestInit = {}): Promise<Resposta> => {
  const resposta = await fetch(`${urlBase}${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers ?? {}) },
  })
  const tipoConteudo = resposta.headers.get('content-type') ?? ''
  const corpo = tipoConteudo.includes('application/json') ? await resposta.json() : undefined
  return { status: resposta.status, corpo, headers: resposta.headers }
}

const cabecalhoToken = (token: string) => ({ Authorization: `Bearer ${token}` })

async function main() {
  const { app } = await import('../src/server')
  const servidor = app.listen(porta)
  let categoriaUsadaId: number | undefined
  let categoriaRemovivelId: number | undefined

  try {
    await new Promise<void>((resolve, reject) => {
      servidor.once('listening', resolve)
      servidor.once('error', reject)
    })

    const saude = await requisicao('/health', { headers: { Origin: 'http://localhost:5173' } })
    verificar(saude.status === 200, 'Health check falhou.')
    verificar(
      saude.headers.get('access-control-allow-origin') === 'http://localhost:5173',
      'CORS nao autorizou a origem local configurada.',
    )

    const origemBloqueada = await requisicao('/health', { headers: { Origin: 'https://origem-nao-permitida.test' } })
    verificar(
      !origemBloqueada.headers.has('access-control-allow-origin'),
      'CORS autorizou uma origem que deveria ser bloqueada.',
    )

    const solicitacoesSemToken = await requisicao('/requests')
    verificar(solicitacoesSemToken.status === 401, 'Rota protegida aceitou requisicao sem token.')

    const administrador = await prisma.user.create({
      data: {
        name: 'Administrador de Teste',
        email: emails.administrador,
        password: await gerarHashSenha('senha-teste-123'),
        role: 'ADMIN',
      },
    })

    const loginAdmin = await requisicao('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: administrador.email, senha: 'senha-teste-123' }),
    })
    verificar(loginAdmin.status === 200, 'Login do administrador falhou.')
    const tokenAdmin = loginAdmin.corpo.token as string

    const categoriaSemToken = await requisicao('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: `Sem token ${sufixo}` }),
    })
    verificar(categoriaSemToken.status === 401, 'Criacao de categoria sem token deveria retornar 401.')

    const categoriaUsada = await requisicao('/categories', {
      method: 'POST',
      headers: cabecalhoToken(tokenAdmin),
      body: JSON.stringify({ name: `Categoria ${sufixo}`, description: 'Categoria temporária para integração.' }),
    })
    verificar(categoriaUsada.status === 201, 'Criação de categoria pelo administrador falhou.')
    categoriaUsadaId = categoriaUsada.corpo.id

    const categoriaRemovivel = await requisicao('/categories', {
      method: 'POST',
      headers: cabecalhoToken(tokenAdmin),
      body: JSON.stringify({ name: `Removível ${sufixo}`, description: 'Categoria para testar edição e remoção.' }),
    })
    verificar(categoriaRemovivel.status === 201, 'Criação de categoria removível falhou.')
    categoriaRemovivelId = categoriaRemovivel.corpo.id

    const categoriaEditada = await requisicao(`/categories/${categoriaRemovivelId}`, {
      method: 'PUT',
      headers: cabecalhoToken(tokenAdmin),
      body: JSON.stringify({ name: `Editada ${sufixo}`, description: 'Categoria atualizada.' }),
    })
    verificar(categoriaEditada.status === 200, 'Edição de categoria falhou.')
    const categoriaExcluida = await requisicao(`/categories/${categoriaRemovivelId}`, {
      method: 'DELETE',
      headers: cabecalhoToken(tokenAdmin),
    })
    verificar(categoriaExcluida.status === 204, 'Exclusão de categoria falhou.')
    categoriaRemovivelId = undefined

    const cadastroCliente = await requisicao('/auth/client/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente de Teste',
        email: emails.cliente,
        senha: 'senha-teste-123',
        telefone: '11999999999',
        endereco: 'Rua de Teste, 100',
      }),
    })
    verificar(cadastroCliente.status === 201, 'Cadastro de cliente falhou.')
    const idCliente = cadastroCliente.corpo.usuario.id as string

    const cadastroPrestador = await requisicao('/auth/provider/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Prestador de Teste',
        email: emails.prestador,
        senha: 'senha-teste-123',
        telefone: '11888888888',
        endereco: 'Avenida de Teste, 200',
        idCategoria: categoriaUsadaId,
      }),
    })
    verificar(cadastroPrestador.status === 201, 'Cadastro de prestador falhou.')
    const idPrestador = cadastroPrestador.corpo.prestador.id as string

    const cadastroPrestadorAlternativo = await requisicao('/auth/provider/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Prestador Alternativo de Teste',
        email: emails.prestadorAlternativo,
        senha: 'senha-teste-123',
        telefone: '11666666666',
        endereco: 'Avenida Alternativa, 300',
        idCategoria: categoriaUsadaId,
      }),
    })
    verificar(cadastroPrestadorAlternativo.status === 201, 'Cadastro do segundo prestador falhou.')
    const idPrestadorAlternativo = cadastroPrestadorAlternativo.corpo.prestador.id as string

    const aprovacao = await requisicao(`/admin/providers/${idPrestador}/approve`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenAdmin),
    })
    verificar(aprovacao.status === 200, 'Aprovação de prestador falhou.')

    const aprovacaoAlternativa = await requisicao(`/admin/providers/${idPrestadorAlternativo}/approve`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenAdmin),
    })
    verificar(aprovacaoAlternativa.status === 200, 'Aprovação do segundo prestador falhou.')

    const loginCliente = await requisicao('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emails.cliente, senha: 'senha-teste-123' }),
    })
    verificar(loginCliente.status === 200, 'Login do cliente falhou.')
    const tokenCliente = loginCliente.corpo.token as string

    const categoriaComPerfilErrado = await requisicao('/categories', {
      method: 'POST',
      headers: cabecalhoToken(tokenCliente),
      body: JSON.stringify({ name: `Perfil errado ${sufixo}` }),
    })
    verificar(categoriaComPerfilErrado.status === 403, 'Cliente conseguiu criar categoria administrativa.')

    const loginPrestador = await requisicao('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emails.prestador, senha: 'senha-teste-123' }),
    })
    verificar(loginPrestador.status === 200, 'Login do prestador falhou.')
    const tokenPrestador = loginPrestador.corpo.token as string

    const loginPrestadorAlternativo = await requisicao('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emails.prestadorAlternativo, senha: 'senha-teste-123' }),
    })
    verificar(loginPrestadorAlternativo.status === 200, 'Login do segundo prestador falhou.')
    const tokenPrestadorAlternativo = loginPrestadorAlternativo.corpo.token as string

    const disponibilidade = await requisicao(`/providers/${idPrestador}/status`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
      body: JSON.stringify({ disponivel: true }),
    })
    verificar(disponibilidade.status === 200, 'Atualização de disponibilidade falhou.')

    const exclusaoCategoriaEmUso = await requisicao(`/categories/${categoriaUsadaId}`, {
      method: 'DELETE',
      headers: cabecalhoToken(tokenAdmin),
    })
    verificar(exclusaoCategoriaEmUso.status === 409, 'Categoria vinculada foi excluída indevidamente.')

    const resumoSemAvaliacoes = await requisicao(`/providers/${idPrestador}/review-summary`)
    verificar(
      resumoSemAvaliacoes.status === 200 && resumoSemAvaliacoes.corpo.origem === 'SEM_AVALIACOES',
      'Resumo sem avaliações deveria responder sem chamar o Gemini.',
    )

    const disponiveis = await requisicao(`/providers?categoryId=${categoriaUsadaId}`)
    verificar(
      disponiveis.status === 200 && disponiveis.corpo.some((item: { id: string }) => item.id === idPrestador),
      'Listagem nao retornou o prestador disponivel.',
    )

    const criacaoSolicitacao = await requisicao('/requests', {
      method: 'POST',
      headers: cabecalhoToken(tokenCliente),
      body: JSON.stringify({
        idCategoria: categoriaUsadaId,
        idPrestador,
        descricao: 'Preciso de atendimento de teste com urgência.',
        endereco: 'Rua de Teste, 100',
        tipoAtendimento: 'IMMEDIATE',
      }),
    })
    verificar(criacaoSolicitacao.status === 201, 'Criação de solicitação falhou.')
    const idSolicitacao = criacaoSolicitacao.corpo.solicitacao.id as number

    const acessoPrestadorErrado = await requisicao(`/requests/${idSolicitacao}`, {
      headers: cabecalhoToken(tokenPrestadorAlternativo),
    })
    verificar(acessoPrestadorErrado.status === 403, 'Outro prestador conseguiu acessar a solicitação.')

    const aceiteComoCliente = await requisicao(`/requests/${idSolicitacao}/provider`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenCliente),
    })
    verificar(aceiteComoCliente.status === 403, 'Cliente conseguiu aceitar uma solicitação como prestador.')

    const aceite = await requisicao(`/requests/${idSolicitacao}/provider`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
    })
    verificar(aceite.status === 200, 'Aceite da solicitação falhou.')

    const transicaoInvalida = await requisicao(`/requests/${idSolicitacao}/status`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    verificar(transicaoInvalida.status === 409, 'Transição inválida de solicitação foi aceita.')

    const inicio = await requisicao(`/requests/${idSolicitacao}/status`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    })
    verificar(inicio.status === 200, 'Início do atendimento falhou.')

    const valor = await requisicao(`/requests/${idSolicitacao}/value`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
      body: JSON.stringify({ valorFinal: 150 }),
    })
    verificar(valor.status === 200, 'Definição de valor final falhou.')

    const conclusao = await requisicao(`/requests/${idSolicitacao}/status`, {
      method: 'PATCH',
      headers: cabecalhoToken(tokenPrestador),
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    verificar(conclusao.status === 200, 'Conclusão do atendimento falhou.')

    const avaliacao = await requisicao('/reviews', {
      method: 'POST',
      headers: cabecalhoToken(tokenCliente),
      body: JSON.stringify({ idSolicitacao, nota: 5, comentario: 'Atendimento rápido e eficiente.' }),
    })
    verificar(avaliacao.status === 201, 'Criação da avaliação falhou.')

    const avaliacaoDuplicada = await requisicao('/reviews', {
      method: 'POST',
      headers: cabecalhoToken(tokenCliente),
      body: JSON.stringify({ idSolicitacao, nota: 4, comentario: 'Avaliação duplicada.' }),
    })
    verificar(avaliacaoDuplicada.status === 409, 'Avaliação duplicada foi aceita.')

    const avaliacoes = await requisicao(`/providers/${idPrestador}/reviews`)
    verificar(avaliacoes.status === 200 && avaliacoes.corpo.avaliacoes.length === 1, 'Listagem de avaliações falhou.')

    let chamadasGeradorResumo = 0
    const gerarResumoMock = async () => {
      chamadasGeradorResumo += 1
      return `Resumo simulado ${chamadasGeradorResumo}`
    }

    const resumoGerado = await obterResumoPrestador(idPrestador, gerarResumoMock)
    verificar(
      resumoGerado?.origem === 'GEMINI' && chamadasGeradorResumo === 1,
      'Geração inicial do resumo com mock falhou.',
    )

    const resumoEmCache = await obterResumoPrestador(idPrestador, async () => {
      throw new Error('O gerador não deveria ser chamado enquanto o cache estiver válido.')
    })
    verificar(resumoEmCache?.origem === 'CACHE', 'Cache do resumo não foi reutilizado.')

    for (let indice = 0; indice < 3; indice += 1) {
      const solicitacaoExtra = await prisma.serviceRequest.create({
        data: {
          clientId: idCliente,
          providerId: idPrestador,
          categoryId: categoriaUsadaId!,
          description: `Solicitação extra ${indice + 1} para invalidar o cache.`,
          address: 'Rua de Teste, 100',
          serviceType: 'IMMEDIATE',
          status: 'COMPLETED',
        },
      })
      await prisma.review.create({
        data: {
          requestId: solicitacaoExtra.id,
          clientId: idCliente,
          providerId: idPrestador,
          rating: 5,
          comment: `Avaliação extra ${indice + 1}.`,
        },
      })
    }

    let falhaGeminiPropagada = false
    try {
      await obterResumoPrestador(idPrestador, async () => {
        throw new Error('Falha simulada do Gemini.')
      })
    } catch (erro) {
      falhaGeminiPropagada = erro instanceof Error && erro.message === 'Falha simulada do Gemini.'
    }
    verificar(falhaGeminiPropagada, 'Falha simulada do Gemini não foi propagada corretamente.')

    const resumoAtualizado = await obterResumoPrestador(idPrestador, gerarResumoMock)
    verificar(
      resumoAtualizado?.origem === 'GEMINI' && chamadasGeradorResumo === 2,
      'Atualização do resumo após invalidar o cache falhou.',
    )

    const perfilCliente = await requisicao(`/clients/${idCliente}`, { headers: cabecalhoToken(tokenCliente) })
    verificar(perfilCliente.status === 200, 'Consulta de perfil do cliente falhou.')

    const atualizacaoCliente = await requisicao(`/clients/${idCliente}`, {
      method: 'PUT',
      headers: cabecalhoToken(tokenCliente),
      body: JSON.stringify({ telefone: '11777777777' }),
    })
    verificar(atualizacaoCliente.status === 200, 'Atualização de perfil do cliente falhou.')

    const dashboard = await requisicao('/admin/dashboard', { headers: cabecalhoToken(tokenAdmin) })
    verificar(dashboard.status === 200, 'Dashboard administrativo falhou.')

    console.log('Teste de integração concluído com sucesso.')
  } finally {
    await prisma.review.deleteMany({ where: { OR: [{ client: { email: emails.cliente } }, { provider: { user: { email: emails.prestador } } }] } })
    await prisma.serviceRequest.deleteMany({ where: { OR: [{ client: { email: emails.cliente } }, { provider: { user: { email: emails.prestador } } }] } })
    await prisma.providerProfile.deleteMany({
      where: { user: { email: { in: [emails.prestador, emails.prestadorAlternativo] } } },
    })
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } })
    await prisma.category.deleteMany({ where: { name: { contains: sufixo } } })
    await new Promise<void>((resolve, reject) => servidor.close((erro) => (erro ? reject(erro) : resolve())))
    await prisma.$disconnect()
  }
}

main().catch((erro) => {
  console.error('Teste de integração falhou:', erro)
  process.exitCode = 1
})
