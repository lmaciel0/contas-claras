// Service worker do Aprumo. Só existe para mostrar a página offline quando a navegação falha por falta de rede.
// Regra de ouro: NUNCA servir o HTML do app nem JS do cache (senão a aba ficaria presa numa versão antiga depois de
// um deploy). Só a página offline e o ícone dela ficam em cache; a API e todo o resto vão direto para a rede.
// Ao mudar offline.html ou icon-192.png, subir a versão do cache (v2, v3...): o activate apaga os caches de outro nome.
const CACHE = 'aprumo-offline-v1'
const PAGINA_OFFLINE = '/offline.html'
const ARQUIVOS = [PAGINA_OFFLINE, '/icon-192.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  // Só navegação: rede primeiro e, se falhar, a página offline. Qualquer outra requisição segue sem respondWith:
  // o navegador cuida, sem cache nosso no meio.
  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match(PAGINA_OFFLINE).then((resposta) => resposta ?? Response.error())))
  }
})
