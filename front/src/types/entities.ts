// Contratos espelhando as respostas da API (repositório trabalho_edecio/Back).

export type UserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BANNED'

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ServiceType = 'IMMEDIATE' | 'SCHEDULED'

export interface User {
  id: string
  nome: string
  email: string
  perfil: UserRole
}

export interface AuthSession {
  token: string
  usuario: User
  prestador?: {
    id: string
    statusAprovacao: ApprovalStatus
  }
}

export interface ClientProfile {
  id: string
  nome: string
  email: string
  telefone: string | null
  endereco: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  createdAt?: string
}

export interface Provider {
  id: string
  userId: string
  categoryId: number
  approvalStatus: ApprovalStatus
  isFeatured: boolean
  isAvailable: boolean
  ratingAverage: number | string
  address: string | null
  aiSummary?: string | null
  createdAt?: string
  user: {
    id: string
    name: string
    phone: string | null
    email?: string
    createdAt?: string
  }
  category: Category
  _count?: {
    reviews: number
    requests: number
  }
}

export interface Review {
  id: number
  rating: number
  comment: string | null
  createdAt: string
}

export interface ReviewSummary {
  resumoGeradoPorIa: string | null
  origem?: 'SEM_AVALIACOES' | 'GEMINI' | 'CACHE'
}

export interface ServiceRequest {
  id: number
  clientId: string
  providerId: string | null
  categoryId: number
  description: string
  address: string
  serviceType: ServiceType
  scheduledAt: string | null
  status: RequestStatus
  finalPrice: number | string | null
  photoUrl: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    phone: string | null
    email?: string
  }
  provider: Provider | null
  category: Category
  review?: { id: number } | null
}

export interface RegistrationData {
  nome: string
  email: string
  senha: string
  telefone?: string
  endereco?: string
}

export interface ProviderRegistrationData extends RegistrationData {
  idCategoria: number
}

export interface AdminDashboardData {
  clientes: number
  avaliacoes: number
  prestadoresPorStatus: Array<{ status: ApprovalStatus; quantidade: number }>
  solicitacoesPorStatus: Array<{ status: RequestStatus; quantidade: number }>
}

export interface AdminReview extends Review {
  requestId: number
  clientId: string
  providerId: string
  client: { id: string; name: string; email: string }
  provider: { id: string; user: { id: string; name: string; email: string } }
  request: { id: number; status: RequestStatus; category: Category }
}

export interface AdminClient {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: string
  _count: { requests: number; reviews: number }
}
