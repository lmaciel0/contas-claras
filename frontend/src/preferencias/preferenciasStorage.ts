import type { IdAtalhoMobile, PreferenciasUsuario } from './preferenciasTipos'

export const CHAVE_PREFERENCIAS = 'aprumo-preferencias'

export const ATALHOS_PADRAO: IdAtalhoMobile[] = ['novo-lancamento', 'cartoes', 'nova-tarefa', 'nova-nota']

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
  'nova-tarefa',
  'nova-nota',
  'cartoes',
  'orcamento',
  'projetos',
  'relatorios',
  'categorias',
  'visao-geral',
]

function validarAtalhos(salvo: unknown): IdAtalhoMobile[] {
  if (!Array.isArray(salvo) || salvo.length !== 4) {
    return ATALHOS_PADRAO
  }
  const todosValidos = salvo.every((id): id is IdAtalhoMobile =>
    typeof id === 'string' && ATALHOS_VALIDOS.includes(id as IdAtalhoMobile)
  )
  if (!todosValidos) {
    return ATALHOS_PADRAO
  }
  return salvo as IdAtalhoMobile[]
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
