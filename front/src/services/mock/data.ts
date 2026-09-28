// Dados de exemplo para rodar o front sem o backend (VITE_USE_MOCK=true).
import type { Category, Provider, Review, ServiceRequest, UserRole } from '../../types/entities'

export interface MockUser {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  role: UserRole
  createdAt: string
}

export interface MockReview extends Review {
  requestId: number
  clientId: string
  providerId: string
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

export const categories: Category[] = [
  { id: 1, name: 'Chaveiro', description: 'Serviços de chaveiro e abertura de portas.' },
  { id: 2, name: 'Encanador', description: 'Reparos hidráulicos e vazamentos.' },
  { id: 3, name: 'Eletricista', description: 'Instalações e reparos elétricos.' },
  { id: 4, name: 'Vidraceiro', description: 'Instalação e reparo de vidros.' },
  { id: 5, name: 'Ar-condicionado', description: 'Instalação, limpeza e manutenção.' },
  { id: 6, name: 'Desentupidora', description: 'Desentupimento de pias, ralos e tubulações.' },
  { id: 7, name: 'Pintor', description: 'Pintura interna, externa e acabamento.' },
  { id: 8, name: 'Montador de móveis', description: 'Montagem e desmontagem de móveis.' },
]

export const users: MockUser[] = [
  { id: 'u-cliente', name: 'Maria Oliveira', email: 'cliente@teste.com', phone: '(53) 99999-0001', address: 'Rua XV de Novembro, 120 - Centro, Pelotas', role: 'CLIENT', createdAt: daysAgo(40) },
  { id: 'u-admin', name: 'Admin Me Socorre', email: 'admin@teste.com', phone: null, address: null, role: 'ADMIN', createdAt: daysAgo(90) },
  { id: 'u-joao', name: 'João Silva', email: 'prestador@teste.com', phone: '(53) 98888-1010', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(80) },
  { id: 'u-ana', name: 'Ana Costa', email: 'ana@teste.com', phone: '(53) 98888-2020', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(70) },
  { id: 'u-carlos', name: 'Carlos Mendes', email: 'carlos@teste.com', phone: '(53) 98888-3030', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(65) },
  { id: 'u-bia', name: 'Beatriz Lima', email: 'bia@teste.com', phone: '(53) 98888-4040', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(50) },
  { id: 'u-rafa', name: 'Rafael Souza', email: 'rafa@teste.com', phone: '(53) 98888-5050', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(30) },
  { id: 'u-paula', name: 'Paula Ramos', email: 'paula@teste.com', phone: '(53) 98888-6060', address: 'Capão do Leão, RS', role: 'PROVIDER', createdAt: daysAgo(3) },
  { id: 'u-leo', name: 'Leonardo Dias', email: 'leo@teste.com', phone: '(53) 98888-7070', address: 'Pelotas, RS', role: 'PROVIDER', createdAt: daysAgo(2) },
]

type ProviderSeed = Omit<Provider, 'user' | 'category' | '_count'>

export const providers: ProviderSeed[] = [
  { id: 'p-joao', userId: 'u-joao', categoryId: 2, approvalStatus: 'APPROVED', isFeatured: true, isAvailable: true, ratingAverage: 4.8, address: 'Centro, Pelotas - RS', aiSummary: 'Os clientes destacam principalmente a rapidez no atendimento, a qualidade do serviço e a cordialidade do profissional.', createdAt: daysAgo(80) },
  { id: 'p-ana', userId: 'u-ana', categoryId: 2, approvalStatus: 'APPROVED', isFeatured: false, isAvailable: true, ratingAverage: 4.7, address: 'Areal, Pelotas - RS', aiSummary: 'Avaliações elogiam a pontualidade e o capricho no acabamento.', createdAt: daysAgo(70) },
  { id: 'p-carlos', userId: 'u-carlos', categoryId: 3, approvalStatus: 'APPROVED', isFeatured: true, isAvailable: true, ratingAverage: 4.9, address: 'Três Vendas, Pelotas - RS', aiSummary: 'Clientes citam segurança, explicações claras e preço justo.', createdAt: daysAgo(65) },
  { id: 'p-bia', userId: 'u-bia', categoryId: 1, approvalStatus: 'APPROVED', isFeatured: false, isAvailable: true, ratingAverage: 4.6, address: 'Fragata, Pelotas - RS', aiSummary: null, createdAt: daysAgo(50) },
  { id: 'p-rafa', userId: 'u-rafa', categoryId: 4, approvalStatus: 'APPROVED', isFeatured: false, isAvailable: false, ratingAverage: 4.4, address: 'Laranjal, Pelotas - RS', aiSummary: null, createdAt: daysAgo(30) },
  { id: 'p-paula', userId: 'u-paula', categoryId: 3, approvalStatus: 'PENDING', isFeatured: false, isAvailable: false, ratingAverage: 0, address: 'Capão do Leão - RS', aiSummary: null, createdAt: daysAgo(3) },
  { id: 'p-leo', userId: 'u-leo', categoryId: 6, approvalStatus: 'PENDING', isFeatured: false, isAvailable: false, ratingAverage: 0, address: 'Centro, Pelotas - RS', aiSummary: null, createdAt: daysAgo(2) },
]

type RequestSeed = Omit<ServiceRequest, 'client' | 'provider' | 'category' | 'review'>

export const requests: RequestSeed[] = [
  { id: 101, clientId: 'u-cliente', providerId: 'p-joao', categoryId: 2, description: 'Vazamento embaixo da pia da cozinha, a água está escorrendo pelo armário.', address: 'Rua XV de Novembro, 120 - Centro, Pelotas', serviceType: 'IMMEDIATE', scheduledAt: null, status: 'PENDING', finalPrice: null, photoUrl: null, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
  { id: 100, clientId: 'u-cliente', providerId: 'p-carlos', categoryId: 3, description: 'Tomada da sala faiscando quando liga o aspirador.', address: 'Rua XV de Novembro, 120 - Centro, Pelotas', serviceType: 'SCHEDULED', scheduledAt: daysAgo(-2), status: 'ACCEPTED', finalPrice: null, photoUrl: null, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: 99, clientId: 'u-cliente', providerId: 'p-joao', categoryId: 2, description: 'Troca de registro do chuveiro que não fecha mais.', address: 'Rua XV de Novembro, 120 - Centro, Pelotas', serviceType: 'IMMEDIATE', scheduledAt: null, status: 'COMPLETED', finalPrice: 180, photoUrl: null, createdAt: daysAgo(12), updatedAt: daysAgo(11) },
  { id: 98, clientId: 'u-cliente', providerId: 'p-joao', categoryId: 2, description: 'Descarga do banheiro correndo água sem parar.', address: 'Rua XV de Novembro, 120 - Centro, Pelotas', serviceType: 'IMMEDIATE', scheduledAt: null, status: 'IN_PROGRESS', finalPrice: null, photoUrl: null, createdAt: daysAgo(0.2), updatedAt: daysAgo(0.1) },
]

export const reviews: MockReview[] = [
  { id: 1, requestId: 90, clientId: 'u-cliente', providerId: 'p-joao', rating: 5, comment: 'Chegou em 20 minutos e resolveu o vazamento rapidinho. Super educado!', createdAt: daysAgo(20) },
  { id: 2, requestId: 91, clientId: 'u-cliente', providerId: 'p-joao', rating: 5, comment: 'Serviço de qualidade e orçamento transparente.', createdAt: daysAgo(35) },
  { id: 3, requestId: 92, clientId: 'u-cliente', providerId: 'p-joao', rating: 4, comment: 'Bom atendimento, só demorou um pouco para chegar.', createdAt: daysAgo(50) },
  { id: 4, requestId: 93, clientId: 'u-cliente', providerId: 'p-carlos', rating: 5, comment: 'Explicou tudo o que estava fazendo, muito confiável.', createdAt: daysAgo(15) },
  { id: 5, requestId: 94, clientId: 'u-cliente', providerId: 'p-ana', rating: 5, comment: 'Pontual e caprichosa.', createdAt: daysAgo(18) },
]
