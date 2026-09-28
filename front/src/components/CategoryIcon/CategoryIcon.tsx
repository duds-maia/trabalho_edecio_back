import {
  Antenna,
  Brush,
  Bug,
  Droplets,
  Hammer,
  KeyRound,
  Laptop,
  Leaf,
  PanelsTopLeft,
  Refrigerator,
  Shield,
  Snowflake,
  Sofa,
  Sparkles,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Mapeia o nome da categoria (vinda do backend) para um ícone.
const ICONS: Array<[RegExp, LucideIcon]> = [
  [/chave/i, KeyRound],
  [/encan/i, Droplets],
  [/eletric/i, Zap],
  [/vidra/i, PanelsTopLeft],
  [/ar-cond|ar cond/i, Snowflake],
  [/desentup/i, Waves],
  [/serralh|pedreiro|marcen/i, Hammer],
  [/montador|estofad/i, Sofa],
  [/pintor/i, Brush],
  [/eletrodom/i, Refrigerator],
  [/inform/i, Laptop],
  [/antena/i, Antenna],
  [/dedetiz/i, Bug],
  [/jardin/i, Leaf],
  [/limpeza/i, Sparkles],
  [/rede/i, Shield],
]

export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? Wrench
  return <Icon width={size} height={size} strokeWidth={1.8} aria-hidden />
}
