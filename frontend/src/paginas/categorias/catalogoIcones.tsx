import type { ReactNode } from 'react'
import {
  Banknote,
  BookOpen,
  BriefcaseMedical,
  Bus,
  Car,
  ClipboardList,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Gift,
  Home,
  Key,
  Monitor,
  MoreHorizontal,
  Music,
  PawPrint,
  Plane,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
  Umbrella,
  UtensilsCrossed,
  Wrench,
  Zap,
} from 'lucide-react'

export interface ItemIcone {
  id: string
  nome: string
  categoria: string
}

export const ICONE_PADRAO = 'outros'

export const CATALOGO_ICONES: ItemIcone[] = [
  // Essenciais dos prints
  { id: 'livro', nome: 'Educação', categoria: 'Básicos' },
  { id: 'computador', nome: 'Eletrônicos', categoria: 'Básicos' },
  { id: 'praia', nome: 'Lazer', categoria: 'Lazer' },
  { id: 'restaurante', nome: 'Restaurante / Alimentação', categoria: 'Alimentação' },
  { id: 'saude', nome: 'Saúde / Farmácia', categoria: 'Saúde' },
  { id: 'servicos', nome: 'Serviços / Contas', categoria: 'Básicos' },
  { id: 'supermercado', nome: 'Supermercado / Mercado', categoria: 'Alimentação' },
  { id: 'transporte', nome: 'Transporte / Ônibus', categoria: 'Transporte' },
  { id: 'casa', nome: 'Casa / Moradia', categoria: 'Moradia' },
  { id: 'salario', nome: 'Salário / Renda', categoria: 'Renda' },
  { id: 'estrela', nome: 'Férias / Bônus', categoria: 'Renda' },
  { id: 'presente', nome: 'Presente', categoria: 'Lazer' },
  { id: 'grafico', nome: 'Investimentos', categoria: 'Renda' },
  { id: 'outros', nome: 'Outros', categoria: 'Geral' },

  // Ícones adicionais frequentes
  { id: 'carro', nome: 'Carro / Combustível', categoria: 'Transporte' },
  { id: 'cartao', nome: 'Cartão de Crédito', categoria: 'Finanças' },
  { id: 'aviao', nome: 'Viagem / Voo', categoria: 'Lazer' },
  { id: 'pet', nome: 'Pet / Animal', categoria: 'Geral' },
  { id: 'esporte', nome: 'Esporte / Academia', categoria: 'Saúde' },
  { id: 'cinema', nome: 'Cinema / Streaming', categoria: 'Lazer' },
  { id: 'cafe', nome: 'Café / Lanche', categoria: 'Alimentação' },
  { id: 'musica', nome: 'Música / Shows', categoria: 'Lazer' },
  { id: 'energia', nome: 'Energia / Luz', categoria: 'Moradia' },
  { id: 'ferramenta', nome: 'Manutenção', categoria: 'Moradia' },
  { id: 'telefone', nome: 'Telefonia / Internet', categoria: 'Básicos' },
  { id: 'chave', nome: 'Aluguel / Imóvel', categoria: 'Moradia' },
  { id: 'tag', nome: 'Geral / Tag', categoria: 'Geral' },
]

export function renderizarIcone(id?: string, className = 'size-5'): ReactNode {
  const chave = (id || ICONE_PADRAO).toLowerCase().trim()
  switch (chave) {
    case 'livro':
      return <BookOpen className={className} aria-hidden="true" />
    case 'computador':
      return <Monitor className={className} aria-hidden="true" />
    case 'praia':
      return <Umbrella className={className} aria-hidden="true" />
    case 'restaurante':
      return <UtensilsCrossed className={className} aria-hidden="true" />
    case 'saude':
      return <BriefcaseMedical className={className} aria-hidden="true" />
    case 'servicos':
      return <ClipboardList className={className} aria-hidden="true" />
    case 'supermercado':
      return <ShoppingCart className={className} aria-hidden="true" />
    case 'transporte':
      return <Bus className={className} aria-hidden="true" />
    case 'casa':
      return <Home className={className} aria-hidden="true" />
    case 'salario':
      return <Banknote className={className} aria-hidden="true" />
    case 'estrela':
      return <Star className={className} aria-hidden="true" />
    case 'presente':
      return <Gift className={className} aria-hidden="true" />
    case 'grafico':
      return <TrendingUp className={className} aria-hidden="true" />
    case 'carro':
      return <Car className={className} aria-hidden="true" />
    case 'cartao':
      return <CreditCard className={className} aria-hidden="true" />
    case 'aviao':
      return <Plane className={className} aria-hidden="true" />
    case 'pet':
      return <PawPrint className={className} aria-hidden="true" />
    case 'esporte':
      return <Dumbbell className={className} aria-hidden="true" />
    case 'cinema':
      return <Film className={className} aria-hidden="true" />
    case 'cafe':
      return <Coffee className={className} aria-hidden="true" />
    case 'musica':
      return <Music className={className} aria-hidden="true" />
    case 'energia':
      return <Zap className={className} aria-hidden="true" />
    case 'ferramenta':
      return <Wrench className={className} aria-hidden="true" />
    case 'telefone':
      return <Phone className={className} aria-hidden="true" />
    case 'chave':
      return <Key className={className} aria-hidden="true" />
    case 'tag':
      return <Tag className={className} aria-hidden="true" />
    case 'outros':
    default:
      return <MoreHorizontal className={className} aria-hidden="true" />
  }
}
