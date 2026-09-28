import type { ApprovalStatus, RequestStatus, UserRole } from '../types/entities'

export const requestStatusLabel: Record<RequestStatus, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceita',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
  BANNED: 'Banido',
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const requestStatusTone: Record<RequestStatus, Tone> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
}

export const approvalStatusTone: Record<ApprovalStatus, Tone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'warning',
  BANNED: 'danger',
}

export function roleHome(role?: UserRole) {
  if (role === 'PROVIDER') return '/prestador'
  if (role === 'ADMIN') return '/admin'
  return '/'
}

export function formatRating(value: number | string | null | undefined) {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
  })
}

export function formatMonthYear(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export function timeAgo(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'ontem' : `há ${days} dias`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Distância fictícia e estável a partir do id (o backend ainda não tem coordenadas). */
export function pseudoDistance(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 1000
  return 0.6 + (hash % 45) / 10
}

export function formatKm(km: number) {
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}
