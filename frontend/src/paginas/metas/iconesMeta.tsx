import { BookOpen, Car, Home, Plane, Shield, Target } from 'lucide-react'
import type { ReactNode } from 'react'

export function getIconePreset(icone: string): ReactNode {
  switch (icone?.toLowerCase()) {
    case 'shield':
      return <Shield className="size-3.5" />
    case 'plane':
      return <Plane className="size-3.5" />
    case 'car':
      return <Car className="size-3.5" />
    case 'home':
      return <Home className="size-3.5" />
    case 'book':
      return <BookOpen className="size-3.5" />
    case 'target':
    default:
      return <Target className="size-3.5" />
  }
}
