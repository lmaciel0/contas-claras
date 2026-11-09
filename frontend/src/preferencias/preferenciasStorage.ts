import type { IdAtalhoMobile, PreferenciasUsuario } from './preferenciasTipos'

export const CHAVE_PREFERENCIAS = 'aprumo-preferencias'

export const ATALHOS_PADRAO: IdAtalhoMobile[] = ['novo-lancamento', 'cartoes', 'nova-receita', 'nova-nota']

export const PREFERENCIAS_PADRAO: PreferenciasUsuario = {
  modoTema: 'sistema',
  presetCor: 'azul',
  layoutLargura: 'centralizado',
  barraFixa: true,
  dockRecolhida: false,
  atalhosMobile: ATALHOS_PADRAO,
}

const ATALHOS_VALIDOS: IdAtalhoMobile[] = [
  'novo-lancamento',
  'nova-receita',
  'nova-nota',
  'cartoes',
  'orcamento',
  'relatorios',
  'categorias',
  'visao-geral',
]

function validarAtalhos(salvo: unknown): IdAtalhoMobile[] {
  if (!Array.isArray(salvo)) {
    return ATALHOS_PADRAO
  }
  const validos = salvo.filter(
    (id): id is IdAtalhoMobile => typeof id === 'string' && ATALHOS_VALIDOS.includes(id as IdAtalhoMobile),
  )
  const unicos: IdAtalhoMobile[] = []
  for (const id of validos) {
    if (!unicos.includes(id)) {
      unicos.push(id)
    }
  }
  for (const padrao of ATALHOS_PADRAO) {
    if (unicos.length >= 4) break
    if (!unicos.includes(padrao)) {
      unicos.push(padrao)
    }
  }
  return unicos.slice(0, 4)
}

export function lerPreferenciasSalvas(): PreferenciasUsuario {
  try {
    const salvo = localStorage.getItem(CHAVE_PREFERENCIAS)
    if (salvo) {
      const parsed = JSON.parse(salvo)
      return {
        modoTema: ['claro', 'escuro', 'sistema'].includes(parsed.modoTema)
          ? parsed.modoTema
          : PREFERENCIAS_PADRAO.modoTema,
        presetCor: ['azul', 'lima', 'esmeralda', 'indigo'].includes(parsed.presetCor)
          ? parsed.presetCor
          : PREFERENCIAS_PADRAO.presetCor,
        layoutLargura: ['centralizado', 'largura-total'].includes(parsed.layoutLargura)
          ? parsed.layoutLargura
          : PREFERENCIAS_PADRAO.layoutLargura,
        barraFixa: typeof parsed.barraFixa === 'boolean' ? parsed.barraFixa : PREFERENCIAS_PADRAO.barraFixa,
        dockRecolhida: typeof parsed.dockRecolhida === 'boolean' ? parsed.dockRecolhida : PREFERENCIAS_PADRAO.dockRecolhida,
        atalhosMobile: validarAtalhos(parsed.atalhosMobile),
      }
    }

    const temaAntigo = localStorage.getItem('aprumo-tema')
    if (temaAntigo === 'claro' || temaAntigo === 'escuro') {
      return { ...PREFERENCIAS_PADRAO, modoTema: temaAntigo }
    }

    return PREFERENCIAS_PADRAO
  } catch {
    return PREFERENCIAS_PADRAO
  }
}

export function gravarPreferencias(prefs: PreferenciasUsuario): void {
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs))
  } catch {
    // modo privativo ou cota esgotada
  }
}
