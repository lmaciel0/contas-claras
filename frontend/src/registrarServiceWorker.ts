interface Ambiente {
  prod: boolean
  nav: Navigator
}

/**
 * Registra o service worker (`/sw.js`), que só serve a página offline quando a navegação falha. Só em produção (em dev o
 * SW atrapalharia o HMR) e só onde o navegador suporta. O registro espera o `load` para não competir com o carregamento
 * inicial, e qualquer erro é engolido: sem SW o app continua funcionando, só não mostra a página offline.
 */
export function registrarServiceWorker(
  ambiente: Ambiente = { prod: import.meta.env.PROD, nav: navigator },
): void {
  if (!ambiente.prod || !('serviceWorker' in ambiente.nav)) {
    return
  }
  const { serviceWorker } = ambiente.nav
  window.addEventListener('load', () => {
    try {
      serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    } catch {
      // Registro bloqueado (ex.: modo privado restrito): segue sem página offline.
    }
  })
}
