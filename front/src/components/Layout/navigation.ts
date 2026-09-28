import {
  ClipboardList,
  FolderTree,
  Gauge,
  House,
  Search,
  Star,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../../types/entities'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Some da barra inferior do celular (fica só no menu do desktop). */
  desktopOnly?: boolean
}

const visitor: NavItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/prestadores', label: 'Buscar', icon: Search },
  { to: '/minhas-solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

const provider: NavItem[] = [
  { to: '/prestador', label: 'Painel', icon: Gauge, end: true },
  { to: '/prestador/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/prestador/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/prestador/perfil', label: 'Perfil', icon: UserRound },
]

const admin: NavItem[] = [
  { to: '/admin', label: 'Painel', icon: Gauge, end: true },
  { to: '/admin/prestadores', label: 'Prestadores', icon: Wrench },
  { to: '/admin/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star, desktopOnly: true },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree, desktopOnly: true },
]

export function navFor(role?: UserRole): NavItem[] {
  if (role === 'PROVIDER') return provider
  if (role === 'ADMIN') return admin
  return visitor
}
