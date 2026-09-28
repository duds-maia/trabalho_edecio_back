/*
 * Simula a API REST em memória, seguindo as mesmas regras do backend.
 * Ativado com VITE_USE_MOCK=true. Contas de teste (qualquer senha):
 *   cliente@teste.com · prestador@teste.com · admin@teste.com
 */
import type {
  ApprovalStatus,
  Provider,
  RequestStatus,
  ServiceRequest,
  UserRole,
} from '../../types/entities'
import { categories, providers, requests, reviews, users, type MockUser } from './data'

type Body = Record<string, unknown> | undefined
type Result = { status: number; data?: unknown }
type Ctx = { user: MockUser | null; body: Body; query: URLSearchParams; params: string[] }
type Handler = (ctx: Ctx) => Result

const ok = (data: unknown, status = 200): Result => ({ status, data })
const fail = (status: number, error: string): Result => ({ status, data: { error } })
const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)

function publicUser(user: MockUser) {
  return { id: user.id, nome: user.name, email: user.email, perfil: user.role }
}

function fullProvider(id: string): Provider | null {
  const p = providers.find((item) => item.id === id)
  if (!p) return null
  const user = users.find((u) => u.id === p.userId)!
  return {
    ...p,
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, createdAt: user.createdAt },
    category: categories.find((c) => c.id === p.categoryId)!,
    _count: {
      reviews: reviews.filter((r) => r.providerId === p.id).length,
      requests: requests.filter((r) => r.providerId === p.id).length,
    },
  }
}

function fullRequest(id: number): ServiceRequest | null {
  const r = requests.find((item) => item.id === id)
  if (!r) return null
  const client = users.find((u) => u.id === r.clientId)!
  const review = reviews.find((rv) => rv.requestId === r.id)
  return {
    ...r,
    client: { id: client.id, name: client.name, phone: client.phone, email: client.email },
    provider: r.providerId ? fullProvider(r.providerId) : null,
    category: categories.find((c) => c.id === r.categoryId)!,
    review: review ? { id: review.id } : null,
  }
}

function recalcRating(providerId: string) {
  const list = reviews.filter((r) => r.providerId === providerId)
  const p = providers.find((item) => item.id === providerId)
  if (p) p.ratingAverage = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
}

const providerOf = (user: MockUser | null) => providers.find((p) => p.userId === user?.id)

function requireRole(ctx: Ctx, ...roles: UserRole[]): Result | null {
  if (!ctx.user) return fail(401, 'Token não informado.')
  if (roles.length && !roles.includes(ctx.user.role)) return fail(403, 'Acesso não permitido para este perfil.')
  return null
}

function register(ctx: Ctx, role: UserRole): Result {
  const b = ctx.body ?? {}
  const email = String(b.email ?? '').toLowerCase()
  if (String(b.nome ?? '').length < 2) return fail(400, 'Nome deve ter ao menos 2 caracteres.')
  if (!email.includes('@')) return fail(400, 'E-mail inválido.')
  if (String(b.senha ?? '').length < 4) return fail(400, 'Senha deve ter ao menos 4 caracteres.')
  if (users.some((u) => u.email === email)) return fail(409, 'E-mail já cadastrado.')

  const user: MockUser = {
    id: `u-${uid()}`,
    name: String(b.nome),
    email,
    phone: (b.telefone as string) ?? null,
    address: (b.endereco as string) ?? null,
    role,
    createdAt: now(),
  }
  users.push(user)

  if (role === 'PROVIDER') {
    const categoryId = Number(b.idCategoria)
    if (!categories.some((c) => c.id === categoryId)) return fail(404, 'Categoria não encontrada.')
    const id = `p-${uid()}`
    providers.push({
      id, userId: user.id, categoryId, approvalStatus: 'PENDING', isFeatured: false, isAvailable: false,
      ratingAverage: 0, address: user.address, aiSummary: null, createdAt: now(),
    })
    return ok({ usuario: publicUser(user), prestador: { id, statusAprovacao: 'PENDING' } }, 201)
  }
  return ok({ usuario: publicUser(user) }, 201)
}

function changeApproval(target: Exclude<ApprovalStatus, 'PENDING'>): Handler {
  const allowed: Record<typeof target, ApprovalStatus[]> = {
    APPROVED: ['PENDING'],
    REJECTED: ['PENDING'],
    SUSPENDED: ['APPROVED'],
    BANNED: ['PENDING', 'APPROVED', 'SUSPENDED'],
  }
  return (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0])
    if (!p) return fail(404, 'Prestador não encontrado.')
    if (!allowed[target].includes(p.approvalStatus)) return fail(409, 'Transição de status não permitida.')
    p.approvalStatus = target
    if (target !== 'APPROVED') p.isAvailable = false
    return ok({ prestador: fullProvider(p.id) })
  }
}

const routes: Array<[string, RegExp, Handler, UserRole[]?]> = [
  // Autenticação
  ['POST', /^\/auth\/login$/, (ctx) => {
    const email = String(ctx.body?.email ?? '').toLowerCase()
    const user = users.find((u) => u.email === email)
    if (!user || !ctx.body?.senha) return fail(401, 'E-mail ou senha inválidos.')
    const p = providerOf(user)
    return ok({
      token: `mock:${user.id}`,
      usuario: publicUser(user),
      prestador: p ? { id: p.id, statusAprovacao: p.approvalStatus } : undefined,
    })
  }],
  ['POST', /^\/auth\/client\/register$/, (ctx) => register(ctx, 'CLIENT')],
  ['POST', /^\/auth\/provider\/register$/, (ctx) => register(ctx, 'PROVIDER')],

  // Categorias
  ['GET', /^\/categories$/, () => ok(categories)],
  ['POST', /^\/categories$/, (ctx) => {
    const name = String(ctx.body?.name ?? '')
    if (name.length < 2) return fail(400, 'Nome inválido.')
    const category = { id: Math.max(0, ...categories.map((c) => c.id)) + 1, name, description: (ctx.body?.description as string) ?? null }
    categories.push(category)
    return ok(category, 201)
  }, ['ADMIN']],
  ['PUT', /^\/categories\/(\d+)$/, (ctx) => {
    const category = categories.find((c) => c.id === Number(ctx.params[0]))
    if (!category) return fail(404, 'Categoria não encontrada.')
    category.name = String(ctx.body?.name ?? category.name)
    category.description = (ctx.body?.description as string) ?? null
    return ok(category)
  }, ['ADMIN']],
  ['DELETE', /^\/categories\/(\d+)$/, (ctx) => {
    const id = Number(ctx.params[0])
    if (providers.some((p) => p.categoryId === id) || requests.some((r) => r.categoryId === id)) {
      return fail(409, 'Categoria possui prestadores ou solicitações vinculadas.')
    }
    const index = categories.findIndex((c) => c.id === id)
    if (index < 0) return fail(404, 'Categoria não encontrada.')
    categories.splice(index, 1)
    return { status: 204 }
  }, ['ADMIN']],

  // Prestadores (público)
  ['GET', /^\/providers$/, (ctx) => {
    const search = ctx.query.get('search')?.toLowerCase()
    const categoryId = Number(ctx.query.get('categoryId'))
    const list = providers
      .filter((p) => p.approvalStatus === 'APPROVED' && p.isAvailable)
      .filter((p) => !categoryId || p.categoryId === categoryId)
      .map((p) => fullProvider(p.id)!)
      .filter((p) => !search || [p.user.name, p.category.name, p.address ?? ''].some((v) => v.toLowerCase().includes(search)))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.ratingAverage) - Number(a.ratingAverage))
    return ok(list)
  }],
  ['GET', /^\/providers\/([\w-]+)\/reviews$/, (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0] && item.approvalStatus === 'APPROVED')
    if (!p) return fail(404, 'Prestador não encontrado.')
    const list = reviews
      .filter((r) => r.providerId === p.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ id, rating, comment, createdAt }) => ({ id, rating, comment, createdAt }))
    return ok({ avaliacaoMedia: p.ratingAverage, avaliacoes: list })
  }],
  ['GET', /^\/providers\/([\w-]+)\/review-summary$/, (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0])
    if (!p) return fail(404, 'Prestador não encontrado.')
    return ok({ resumoGeradoPorIa: p.aiSummary ?? null, origem: p.aiSummary ? 'CACHE' : 'SEM_AVALIACOES' })
  }],
  ['GET', /^\/providers\/([\w-]+)$/, (ctx) => {
    const p = fullProvider(ctx.params[0])
    if (!p || p.approvalStatus !== 'APPROVED') {
      // O próprio prestador precisa ver o seu perfil mesmo sem aprovação.
      if (p && providerOf(ctx.user)?.id === p.id) return ok(p)
      return fail(404, 'Prestador não encontrado')
    }
    return ok(p)
  }],
  ['PUT', /^\/providers\/([\w-]+)$/, (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0])
    if (!p) return fail(404, 'Prestador não encontrado.')
    if (ctx.user!.role !== 'ADMIN' && p.userId !== ctx.user!.id) return fail(403, 'Você não tem permissão para editar este perfil.')
    const user = users.find((u) => u.id === p.userId)!
    const b = ctx.body ?? {}
    if (b.nome) user.name = String(b.nome)
    if ('telefone' in b) user.phone = (b.telefone as string) ?? null
    if ('endereco' in b) p.address = (b.endereco as string) ?? null
    if (b.idCategoria) p.categoryId = Number(b.idCategoria)
    return ok(fullProvider(p.id))
  }, ['PROVIDER', 'ADMIN']],
  ['PATCH', /^\/providers\/([\w-]+)\/status$/, (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0])
    if (!p) return fail(404, 'Prestador não encontrado.')
    if (ctx.user!.role !== 'ADMIN' && p.userId !== ctx.user!.id) return fail(403, 'Você não tem permissão para alterar a disponibilidade.')
    if (p.approvalStatus !== 'APPROVED') return fail(409, 'Apenas prestadores aprovados podem alterar a disponibilidade.')
    p.isAvailable = Boolean(ctx.body?.disponivel)
    return ok(fullProvider(p.id))
  }, ['PROVIDER', 'ADMIN']],

  // Clientes
  ['GET', /^\/clients\/([\w-]+)$/, (ctx) => {
    if (ctx.user!.role !== 'ADMIN' && ctx.user!.id !== ctx.params[0]) return fail(403, 'Você não tem permissão para acessar este perfil.')
    const u = users.find((item) => item.id === ctx.params[0])
    if (!u) return fail(404, 'Cliente não encontrado.')
    return ok({ cliente: { id: u.id, nome: u.name, email: u.email, telefone: u.phone, endereco: u.address, criadoEm: u.createdAt, atualizadoEm: u.createdAt } })
  }, ['CLIENT', 'ADMIN']],
  ['PUT', /^\/clients\/([\w-]+)$/, (ctx) => {
    if (ctx.user!.role !== 'ADMIN' && ctx.user!.id !== ctx.params[0]) return fail(403, 'Você não tem permissão para editar este perfil.')
    const u = users.find((item) => item.id === ctx.params[0])
    if (!u) return fail(404, 'Cliente não encontrado.')
    const b = ctx.body ?? {}
    if (b.nome) u.name = String(b.nome)
    if ('telefone' in b) u.phone = (b.telefone as string) ?? null
    if ('endereco' in b) u.address = (b.endereco as string) ?? null
    return ok({ cliente: { id: u.id, nome: u.name, email: u.email, telefone: u.phone, endereco: u.address, criadoEm: u.createdAt, atualizadoEm: now() } })
  }, ['CLIENT', 'ADMIN']],

  // Solicitações
  ['POST', /^\/requests$/, (ctx) => {
    const b = ctx.body ?? {}
    if (String(b.descricao ?? '').length < 10) return fail(400, 'Descrição deve ter ao menos 10 caracteres.')
    if (String(b.endereco ?? '').length < 5) return fail(400, 'Informe um endereço válido.')
    if (b.tipoAtendimento === 'SCHEDULED' && !b.dataAgendamento) return fail(400, 'Informe a data do agendamento.')
    const p = providers.find((item) => item.id === b.idPrestador)
    if (!p || p.approvalStatus !== 'APPROVED' || !p.isAvailable || p.categoryId !== Number(b.idCategoria)) {
      return fail(409, 'Prestador indisponível ou de outra categoria.')
    }
    const id = Math.max(0, ...requests.map((r) => r.id)) + 1
    requests.unshift({
      id, clientId: ctx.user!.id, providerId: p.id, categoryId: p.categoryId,
      description: String(b.descricao), address: String(b.endereco),
      serviceType: b.tipoAtendimento === 'SCHEDULED' ? 'SCHEDULED' : 'IMMEDIATE',
      scheduledAt: (b.dataAgendamento as string) ?? null, status: 'PENDING', finalPrice: null,
      photoUrl: (b.fotoUrl as string) ?? null, createdAt: now(), updatedAt: now(),
    })
    return ok({ solicitacao: fullRequest(id) }, 201)
  }, ['CLIENT']],
  ['GET', /^\/requests$/, (ctx) => {
    const status = ctx.query.get('status')
    const user = ctx.user!
    let list = requests
    if (user.role === 'CLIENT') list = list.filter((r) => r.clientId === user.id)
    if (user.role === 'PROVIDER') {
      const p = providerOf(user)
      if (!p || p.approvalStatus !== 'APPROVED') return fail(403, 'Prestador não aprovado.')
      list = list.filter((r) => r.providerId === p.id)
    }
    if (status) list = list.filter((r) => r.status === status)
    return ok({ solicitacoes: list.map((r) => fullRequest(r.id)) })
  }, []],
  ['GET', /^\/requests\/(\d+)$/, (ctx) => {
    const r = fullRequest(Number(ctx.params[0]))
    if (!r) return fail(404, 'Solicitação não encontrada.')
    const user = ctx.user!
    if (user.role === 'CLIENT' && r.clientId !== user.id) return fail(403, 'Você não tem permissão para acessar esta solicitação.')
    if (user.role === 'PROVIDER' && r.providerId !== providerOf(user)?.id) return fail(403, 'Você não tem permissão para acessar esta solicitação.')
    return ok({ solicitacao: r })
  }, []],
  ['PATCH', /^\/requests\/(\d+)\/provider$/, (ctx) => {
    const p = providerOf(ctx.user)
    if (!p || p.approvalStatus !== 'APPROVED' || !p.isAvailable) {
      return fail(403, 'Prestador precisa estar aprovado e disponível para aceitar solicitações.')
    }
    const r = requests.find((item) => item.id === Number(ctx.params[0]))
    if (!r || r.providerId !== p.id || r.status !== 'PENDING') return fail(409, 'Solicitação indisponível para aceite.')
    r.status = 'ACCEPTED'
    r.updatedAt = now()
    return ok({ solicitacao: fullRequest(r.id) })
  }, ['PROVIDER']],
  ['PATCH', /^\/requests\/(\d+)\/status$/, (ctx) => {
    const r = requests.find((item) => item.id === Number(ctx.params[0]))
    if (!r) return fail(404, 'Solicitação não encontrada.')
    const next = ctx.body?.status as RequestStatus
    const user = ctx.user!
    if (user.role === 'CLIENT') {
      if (r.clientId !== user.id) return fail(403, 'Você não tem permissão para alterar esta solicitação.')
      if (next !== 'CANCELLED' || r.status !== 'PENDING') return fail(409, 'Cliente pode cancelar apenas solicitações pendentes.')
    }
    if (user.role === 'PROVIDER') {
      if (r.providerId !== providerOf(user)?.id) return fail(403, 'Você não tem permissão para alterar esta solicitação.')
      const valid =
        (r.status === 'ACCEPTED' && next === 'IN_PROGRESS') || (r.status === 'IN_PROGRESS' && next === 'COMPLETED')
      if (!valid) return fail(409, 'Transição de status inválida.')
    }
    r.status = next
    r.updatedAt = now()
    return ok({ solicitacao: fullRequest(r.id) })
  }, ['CLIENT', 'PROVIDER', 'ADMIN']],
  ['PATCH', /^\/requests\/(\d+)\/value$/, (ctx) => {
    const r = requests.find((item) => item.id === Number(ctx.params[0]))
    if (!r) return fail(404, 'Solicitação não encontrada.')
    if (ctx.user!.role === 'PROVIDER') {
      const allowed = r.providerId === providerOf(ctx.user)?.id && ['IN_PROGRESS', 'COMPLETED'].includes(r.status)
      if (!allowed) return fail(403, 'Você não pode informar o valor desta solicitação.')
    }
    const value = Number(ctx.body?.valorFinal)
    if (!(value > 0)) return fail(400, 'Informe um valor maior que zero.')
    r.finalPrice = value
    return ok({ solicitacao: fullRequest(r.id) })
  }, ['PROVIDER', 'ADMIN']],

  // Avaliações
  ['POST', /^\/reviews$/, (ctx) => {
    const b = ctx.body ?? {}
    const r = requests.find((item) => item.id === Number(b.idSolicitacao))
    if (!r) return fail(404, 'Solicitação não encontrada.')
    if (r.clientId !== ctx.user!.id) return fail(403, 'Você não pode avaliar esta solicitação.')
    if (r.status !== 'COMPLETED') return fail(409, 'A solicitação precisa estar concluída para ser avaliada.')
    if (reviews.some((rv) => rv.requestId === r.id)) return fail(409, 'Esta solicitação já foi avaliada.')
    const nota = Number(b.nota)
    if (!(nota >= 1 && nota <= 5)) return fail(400, 'Nota deve ser entre 1 e 5.')
    const id = Math.max(0, ...reviews.map((rv) => rv.id)) + 1
    reviews.push({ id, requestId: r.id, clientId: r.clientId, providerId: r.providerId!, rating: nota, comment: (b.comentario as string) ?? null, createdAt: now() })
    recalcRating(r.providerId!)
    return ok({ avaliacao: { id } }, 201)
  }, ['CLIENT']],

  // Administração
  ['GET', /^\/admin\/dashboard$/, () => {
    const count = <T extends string>(values: T[]) =>
      [...new Set(values)].map((status) => ({ status, quantidade: values.filter((v) => v === status).length }))
    return ok({
      clientes: users.filter((u) => u.role === 'CLIENT').length,
      avaliacoes: reviews.length,
      prestadoresPorStatus: count(providers.map((p) => p.approvalStatus)),
      solicitacoesPorStatus: count(requests.map((r) => r.status)),
    })
  }, ['ADMIN']],
  ['GET', /^\/admin\/providers$/, (ctx) => {
    const status = ctx.query.get('status')
    const list = providers
      .filter((p) => !status || p.approvalStatus === status)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .map((p) => fullProvider(p.id))
    return ok({ prestadores: list })
  }, ['ADMIN']],
  ['PATCH', /^\/admin\/providers\/([\w-]+)\/approve$/, changeApproval('APPROVED'), ['ADMIN']],
  ['PATCH', /^\/admin\/providers\/([\w-]+)\/reject$/, changeApproval('REJECTED'), ['ADMIN']],
  ['PATCH', /^\/admin\/providers\/([\w-]+)\/suspend$/, changeApproval('SUSPENDED'), ['ADMIN']],
  ['PATCH', /^\/admin\/providers\/([\w-]+)\/ban$/, changeApproval('BANNED'), ['ADMIN']],
  ['PATCH', /^\/admin\/providers\/([\w-]+)\/featured$/, (ctx) => {
    const p = providers.find((item) => item.id === ctx.params[0])
    if (!p) return fail(404, 'Prestador não encontrado.')
    if (p.approvalStatus !== 'APPROVED') return fail(409, 'Apenas prestadores aprovados podem receber destaque.')
    p.isFeatured = Boolean(ctx.body?.destaque)
    return ok({ prestador: fullProvider(p.id) })
  }, ['ADMIN']],
  ['GET', /^\/admin\/reviews$/, () => ok({
    avaliacoes: [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((rv) => {
      const client = users.find((u) => u.id === rv.clientId)!
      const p = fullProvider(rv.providerId)!
      const req = fullRequest(rv.requestId)
      return {
        ...rv,
        client: { id: client.id, name: client.name, email: client.email },
        provider: { id: p.id, user: { id: p.user.id, name: p.user.name, email: p.user.email ?? '' } },
        request: { id: rv.requestId, status: req?.status ?? 'COMPLETED', category: req?.category ?? p.category },
      }
    }),
  }), ['ADMIN']],
  ['GET', /^\/admin\/requests$/, () => ok({ solicitacoes: requests.map((r) => fullRequest(r.id)) }), ['ADMIN']],
  ['GET', /^\/admin\/clients$/, () => ok({
    clientes: users.filter((u) => u.role === 'CLIENT').map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, createdAt: u.createdAt,
      _count: {
        requests: requests.filter((r) => r.clientId === u.id).length,
        reviews: reviews.filter((r) => r.clientId === u.id).length,
      },
    })),
  }), ['ADMIN']],
]

export async function mockRequest(method: string, fullPath: string, body: Body, token: string | null): Promise<Result> {
  await new Promise((resolve) => setTimeout(resolve, 250)) // latência de rede simulada

  const [path, queryString] = fullPath.split('?')
  const user = token?.startsWith('mock:') ? (users.find((u) => u.id === token.slice(5)) ?? null) : null

  for (const [routeMethod, pattern, handler, roles] of routes) {
    if (routeMethod !== method) continue
    const match = path.match(pattern)
    if (!match) continue

    const ctx: Ctx = { user, body, query: new URLSearchParams(queryString), params: match.slice(1) }
    if (roles) {
      const denied = requireRole(ctx, ...roles)
      if (denied) return denied
    }
    // Cópia profunda para o front não alterar o "banco" por referência.
    const result = handler(ctx)
    return { status: result.status, data: result.data === undefined ? undefined : structuredClone(result.data) }
  }
  return fail(404, 'Rota não encontrada.')
}
