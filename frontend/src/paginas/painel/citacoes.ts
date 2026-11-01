export interface Citacao {
  id: string
  frase: string
  autor: string
  obra: string
  detalhe?: string
}

export const CITACOES: Citacao[] = [
  {
    id: 'marco-aurelio-retiro',
    frase:
      'As pessoas procuram retiros no campo, no litoral, nas montanhas. Mas em nenhum lugar alguém encontra retiro mais tranquilo do que dentro da própria alma.',
    autor: 'Marco Aurélio',
    obra: 'Meditações',
    detalhe: 'Livro IV, 3 · tradução livre',
  },
  {
    id: 'seneca-ousadia',
    frase:
      'Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.',
    autor: 'Sêneca',
    obra: 'Cartas a Lucílio',
    detalhe: 'Carta 104',
  },
  {
    id: 'epicteto-julgamento',
    frase:
      'Não são as coisas que nos perturbam, mas o julgamento que fazemos a respeito delas.',
    autor: 'Epicteto',
    obra: 'Enchiridion',
    detalhe: 'Capítulo 5',
  },
  {
    id: 'marco-aurelio-pensamentos',
    frase: 'A felicidade da sua vida depende da qualidade dos seus pensamentos.',
    autor: 'Marco Aurélio',
    obra: 'Meditações',
    detalhe: 'Livro III, 9',
  },
  {
    id: 'seneca-viver-bem',
    frase:
      'Apressa-te a viver bem e pensa que cada dia é, por si só, uma vida inteira.',
    autor: 'Sêneca',
    obra: 'Cartas a Lucílio',
    detalhe: 'Carta 101',
  },
  {
    id: 'epicteto-falar',
    frase: 'Primeiro aprenda o significado do que você diz, e então fale.',
    autor: 'Epicteto',
    obra: 'Discursos',
    detalhe: 'Livro III',
  },
  {
    id: 'marco-aurelio-manha',
    frase:
      'Quando acordar pela manhã, pense no privilégio precioso de estar vivo — respirar, pensar, desfrutar, amar.',
    autor: 'Marco Aurélio',
    obra: 'Meditações',
    detalhe: 'Livro II, 1',
  },
]

const CHAVE_FAVORITOS = 'aprumo-reflexoes-favoritas'

/** Retorna de forma determinística uma citação baseada no dia do ano. */
export function obterCitacaoDoDia(data: Date = new Date()): Citacao {
  const inicioDoAno = new Date(data.getFullYear(), 0, 0)
  const diff = data.getTime() - inicioDoAno.getTime()
  const umDia = 1000 * 60 * 60 * 24
  const diaDoAno = Math.floor(diff / umDia)
  const indice = Math.abs(diaDoAno) % CITACOES.length
  return CITACOES[indice] ?? CITACOES[0]!
}

/** Retorna a próxima citação do catálogo em ordem cíclica. */
export function obterProximaCitacao(idAtual: string): Citacao {
  const indiceAtual = CITACOES.findIndex((c) => c.id === idAtual)
  if (indiceAtual === -1) return CITACOES[0]!
  const proximoIndice = (indiceAtual + 1) % CITACOES.length
  return CITACOES[proximoIndice] ?? CITACOES[0]!
}

export function listarFavoritos(): string[] {
  try {
    const valor = localStorage.getItem(CHAVE_FAVORITOS)
    if (!valor) return []
    return JSON.parse(valor) as string[]
  } catch {
    return []
  }
}

export function isFavorito(id: string): boolean {
  return listarFavoritos().includes(id)
}

export function salvarFavorito(id: string): void {
  try {
    const favoritos = listarFavoritos()
    if (!favoritos.includes(id)) {
      favoritos.push(id)
      localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos))
    }
  } catch {
    // ignora falha de cota de localStorage
  }
}

export function removerFavorito(id: string): void {
  try {
    const favoritos = listarFavoritos().filter((favId) => favId !== id)
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos))
  } catch {
    // ignora falha de cota de localStorage
  }
}
