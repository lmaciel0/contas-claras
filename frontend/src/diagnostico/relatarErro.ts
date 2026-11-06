import { ErroApi } from '../api/cliente'

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

/** Campos do `ErrorEvent` que interessam para descartar ruído. */
export interface EventoDeErro {
  error?: unknown
  message?: string
  filename?: string
}

const RUIDO_SEM_OBJETO = /^Script error\.?$|ResizeObserver loop/
const ERRO_DE_REDE = /Failed to fetch|NetworkError|Load failed/

/** Remove o que pode ser dado pessoal: e-mails, tokens longos, query string e fragmento de URLs. */
function limpar(texto: string): string {
  return texto
    .replace(/[^\s@]+@[^\s@]+/g, '[email]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[token]')
    .replace(/\?[^\s)'"]*/g, '')
    .replace(/#[^\s)'"]*/g, '')
}

/** Erros que não ajudam a corrigir nada: de fora do app, da rede ou da navegação. Não gastam vaga do limite. */
function ignorar(erro: unknown, evento?: EventoDeErro): boolean {
  if (evento?.error == null && RUIDO_SEM_OBJETO.test(evento?.message ?? (typeof erro === 'string' ? erro : ''))) {
    return true
  }
  if (evento?.filename && !evento.filename.startsWith(window.location.origin)) {
    return true
  }
  if (!(erro instanceof Error) && typeof erro !== 'string') {
    return true
  }
  if (erro instanceof Error) {
    return (
      erro.name === 'AbortError' ||
      (erro instanceof ErroApi && erro.status === 0) ||
      ERRO_DE_REDE.test(erro.message)
    )
  }
  return ERRO_DE_REDE.test(erro)
}

function mensagemDe(erro: unknown): string {
  const texto = limpar(erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : '')
  return (texto.trim() === '' ? 'Erro sem mensagem' : texto).slice(0, MAX_MENSAGEM)
}

function pilhaDe(erro: unknown, pilhaComponentes?: string): string | undefined {
  const pilha = limpar(`${erro instanceof Error ? (erro.stack ?? '') : ''}${pilhaComponentes ?? ''}`)
  return pilha === '' ? undefined : pilha.slice(0, MAX_PILHA)
}

/** Primeira linha de código da pilha (o cabeçalho "Erro: mensagem" já está na mensagem), para distinguir origens. */
function primeiraLinhaDe(pilha: string | undefined): string {
  const linhas = (pilha ?? '').split('\n').map((linha) => linha.trim()).filter(Boolean)
  return linhas.find((linha) => linha.startsWith('at ') || linha.includes('@')) ?? linhas[0] ?? ''
}

/** Só o caminho, sem query string nem fragmento, e com ids numéricos trocados por `:id`. */
function rotaAtual(): string {
  const rota = window.location.pathname.replace(/\/\d+(?=\/|$)/g, '/:id').slice(0, MAX_ROTA)
  return rota === '' ? '/' : rota
}

/**
 * Cria o relator de erros inesperados. Envia `{ mensagem, pilha, rota }` a `POST /api/diagnostico/erros`, sem corpo de
 * requisição, id de usuário nem query string; e-mails e tokens são removidos antes do corte. Envia no máximo 5 vezes
 * por instância (uma por carga de página), sem repetir a mesma mensagem e origem, e descarta ruído (script de outra
 * origem, erro de rede, abortos) antes de gastar vaga. O envio usa `fetch` direto, sem o cliente com retentativa, e
 * qualquer falha é engolida para que o relato de um erro nunca gere outro. Só envia em produção; `enviar` existe para
 * os testes, como em `registrarServiceWorker`.
 */
export function criarRelator({ prod, enviar }: Ambiente) {
  const jaRelatadas = new Set<string>()

  return function relatar(erro: unknown, pilhaComponentes?: string, evento?: EventoDeErro): void {
    if (!prod || jaRelatadas.size >= MAX_RELATOS) {
      return
    }
    try {
      if (ignorar(erro, evento)) {
        return
      }
      const mensagem = mensagemDe(erro)
      const pilha = pilhaDe(erro, pilhaComponentes)
      const chave = `${mensagem}\n${primeiraLinhaDe(pilha)}`
      if (jaRelatadas.has(chave)) {
        return
      }
      jaRelatadas.add(chave)
      const envio = enviar ?? fetch
      envio(URL_RELATO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem, pilha, rota: rotaAtual() }),
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
export function instalarRelatoGlobal(relatar: ReturnType<typeof criarRelator> = relatarErro) {
  const aoErro = (evento: ErrorEvent) => relatar(evento.error ?? evento.message, undefined, evento)
  const aoRejeitar = (evento: PromiseRejectionEvent) => relatar(evento.reason)
  window.addEventListener('error', aoErro)
  window.addEventListener('unhandledrejection', aoRejeitar)
  return () => {
    window.removeEventListener('error', aoErro)
    window.removeEventListener('unhandledrejection', aoRejeitar)
  }
}
