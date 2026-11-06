const URL_RELATO = '/api/diagnostico/erros'
/** Limites do contrato do back (`RelatoErroRequest`). */
const MAX_MENSAGEM = 500
const MAX_PILHA = 4000
const MAX_ROTA = 200
/** Teto por carga de página: um erro em laço não vira enxurrada de requisições. */
const MAX_RELATOS = 5

interface Ambiente {
  prod: boolean
  enviar?: typeof fetch
}

function mensagemDe(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : ''
  return (texto.trim() === '' ? 'Erro sem mensagem' : texto).slice(0, MAX_MENSAGEM)
}

function pilhaDe(erro: unknown, pilhaComponentes?: string): string | undefined {
  const pilha = `${erro instanceof Error ? (erro.stack ?? '') : ''}${pilhaComponentes ?? ''}`
  return pilha === '' ? undefined : pilha.slice(0, MAX_PILHA)
}

/** Só o caminho: sem query string nem fragmento, que podem carregar dados pessoais. */
function rotaAtual(): string {
  const rota = window.location.pathname.slice(0, MAX_ROTA)
  return rota === '' ? '/' : rota
}

/**
 * Cria o relator de erros inesperados. Envia `{ mensagem, pilha, rota }` (sem corpo de requisição, e-mail nem id de
 * usuário) a `POST /api/diagnostico/erros`, no máximo 5 vezes por instância (uma por carga de página) e sem repetir
 * mensagem. O envio usa `fetch` direto, sem o cliente com retentativa, e qualquer falha é engolida para que o relato
 * de um erro nunca gere outro. Só envia em produção; `enviar` existe para os testes, como em `registrarServiceWorker`.
 */
export function criarRelator({ prod, enviar }: Ambiente) {
  const jaRelatadas = new Set<string>()

  return function relatar(erro: unknown, pilhaComponentes?: string): void {
    if (!prod || jaRelatadas.size >= MAX_RELATOS) {
      return
    }
    try {
      const mensagem = mensagemDe(erro)
      if (jaRelatadas.has(mensagem)) {
        return
      }
      jaRelatadas.add(mensagem)
      const corpo = { mensagem, pilha: pilhaDe(erro, pilhaComponentes), rota: rotaAtual() }
      const envio = enviar ?? fetch
      envio(URL_RELATO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        keepalive: true,
        credentials: 'omit',
      }).catch(() => undefined)
    } catch {
      // Relatar é só diagnóstico: nunca pode derrubar nem repetir o erro original.
    }
  }
}

/** Relator da página: ativo só em produção. */
export const relatarErro = criarRelator({ prod: import.meta.env.PROD })

/**
 * Relata o que escapa das fronteiras de erro do React (eventos, código assíncrono e promessas rejeitadas).
 * Devolve a função que remove os ouvintes.
 */
export function instalarRelatoGlobal(relatar: (erro: unknown) => void = relatarErro) {
  const aoErro = (evento: ErrorEvent) => relatar(evento.error ?? evento.message)
  const aoRejeitar = (evento: PromiseRejectionEvent) => relatar(evento.reason)
  window.addEventListener('error', aoErro)
  window.addEventListener('unhandledrejection', aoRejeitar)
  return () => {
    window.removeEventListener('error', aoErro)
    window.removeEventListener('unhandledrejection', aoRejeitar)
  }
}
