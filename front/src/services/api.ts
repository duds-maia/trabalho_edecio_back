import { mockRequest } from './mock/handler'

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const SESSION_KEY = 'me-socorre:session'
export const SESSION_EXPIRED_EVENT = 'me-socorre:session-expired'

const statusMessages: Record<number, string> = {
  400: 'Confira os dados informados e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'O conteúdo solicitado não foi encontrado.',
  409: 'Não foi possível concluir por causa de um conflito nos dados.',
  429: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// O backend responde { error: string } ou { error: zod.flatten() }.
function extractApiMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('error' in data)) return undefined
  const error = (data as { error: unknown }).error
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return undefined

  const { fieldErrors, formErrors } = error as {
    fieldErrors?: Record<string, string[] | undefined>
    formErrors?: string[]
  }
  for (const messages of Object.values(fieldErrors ?? {})) {
    if (messages?.[0]) return messages[0]
  }
  return formErrors?.[0]
}

function getToken(): string | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? ((JSON.parse(stored) as { token?: string }).token ?? null) : null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const method = options.method ?? 'GET'

  let status: number
  let data: unknown

  if (USE_MOCK) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : undefined
    ;({ status, data } = await mockRequest(method, path, body, token))
  } else {
    const headers = new Headers(options.headers)
    if (options.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    let response: Response
    try {
      response = await fetch(`${API_URL}${path}`, { ...options, headers })
    } catch {
      throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está ligado.', 0)
    }
    status = response.status
    data = status === 204 ? undefined : await response.json().catch(() => null)
  }

  if (status >= 400) {
    if (status === 401 && token) {
      localStorage.removeItem(SESSION_KEY)
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    throw new ApiError(
      extractApiMessage(data) || statusMessages[status] || 'Algo deu errado. Tente novamente.',
      status,
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export const isMockMode = USE_MOCK
