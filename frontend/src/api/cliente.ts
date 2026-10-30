/** Erro devolvido pela API (`{"erro": "..."}`) ou falha de rede/tempo esgotado (`status` 0). */
export class ErroApi extends Error {
  readonly status: number
  readonly mensagem: string

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.mensagem = mensagem
  }
}

/** Depois deste tempo sem resposta, o front assume que a API está acordando (cold start do Render). */
const AVISO_APOS_MS = 3_000
/** Tempo máximo de espera por uma chamada; a API grátis leva ~30–60 s para acordar. */
const TIMEOUT_MS = 90_000

const MENSAGEM_SEM_RESPOSTA = 'Servidor não respondeu. Tente de novo.'
const MENSAGEM_PADRAO = 'Algo deu errado. Tente de novo.'

// --- Estado global "servidor acordando" -------------------------------------------------------
let chamadasLentas = 0
const ouvintesAcordando = new Set<() => void>()

/** `true` enquanto houver ao menos uma chamada esperando a API há mais de 3 s. */
export function servidorAcordando(): boolean {
  return chamadasLentas > 0
}

/** Avisa quando `servidorAcordando()` muda (serve de `subscribe` para `useSyncExternalStore`). */
export function aoMudarServidorAcordando(ouvinte: () => void): () => void {
  ouvintesAcordando.add(ouvinte)
  return () => {
    ouvintesAcordando.delete(ouvinte)
  }
}

function marcarChamadaLenta(delta: 1 | -1) {
  const antes = servidorAcordando()
  chamadasLentas += delta
  if (antes !== servidorAcordando()) {
    ouvintesAcordando.forEach((ouvinte) => ouvinte())
  }
}

// --- Sessão expirada --------------------------------------------------------------------------
let tratarNaoAutenticado: (() => void) | null = null

/** Registra o que fazer quando qualquer chamada responde 401. Devolve a função que desfaz o registro. */
export function aoNaoAutenticado(tratador: () => void): () => void {
  tratarNaoAutenticado = tratador
  return () => {
    if (tratarNaoAutenticado === tratador) {
      tratarNaoAutenticado = null
    }
  }
}

// --- Cliente ----------------------------------------------------------------------------------
async function lerCorpo(resposta: Response): Promise<unknown> {
  const texto = await resposta.text()
  if (texto === '') {
    return undefined
  }
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return undefined
  }
}

function mensagemDoErro(corpo: unknown): string {
  if (typeof corpo === 'object' && corpo !== null && 'erro' in corpo && typeof corpo.erro === 'string') {
    return corpo.erro
  }
  return MENSAGEM_PADRAO
}

/**
 * Chama a API. Sempre envia o cookie de sessão (`same-origin`) e, havendo corpo, `Content-Type: application/json`.
 * Erro HTTP vira `ErroApi` com a mensagem de `{erro}`; 401 também aciona o tratador de `aoNaoAutenticado`.
 * Sem resposta em 3 s liga `servidorAcordando()`; sem resposta em 90 s rejeita com `ErroApi` de `status` 0.
 */
export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers)
  if (opcoes.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const controle = new AbortController()
  const sinais = opcoes.signal ? [opcoes.signal, controle.signal] : [controle.signal]
  let expirou = false
  let contadaComoLenta = false

  const temporizadorAviso = setTimeout(() => {
    contadaComoLenta = true
    marcarChamadaLenta(1)
  }, AVISO_APOS_MS)
  const temporizadorLimite = setTimeout(() => {
    expirou = true
    controle.abort()
  }, TIMEOUT_MS)

  try {
    const resposta = await fetch(caminho, {
      ...opcoes,
      headers,
      credentials: 'same-origin',
      signal: AbortSignal.any(sinais),
    })
    const corpo = await lerCorpo(resposta)

    if (!resposta.ok) {
      const erro = new ErroApi(resposta.status, mensagemDoErro(corpo))
      if (resposta.status === 401) {
        tratarNaoAutenticado?.()
      }
      throw erro
    }
    return corpo as T
  } catch (erro) {
    if (erro instanceof ErroApi) {
      throw erro
    }
    if (opcoes.signal?.aborted) {
      throw erro // cancelado por quem chamou (ex.: TanStack Query); não é falha do servidor
    }
    if (expirou || erro instanceof TypeError || (erro instanceof DOMException && erro.name === 'AbortError')) {
      throw new ErroApi(0, MENSAGEM_SEM_RESPOSTA)
    }
    throw erro
  } finally {
    clearTimeout(temporizadorAviso)
    clearTimeout(temporizadorLimite)
    if (contadaComoLenta) {
      marcarChamadaLenta(-1)
    }
  }
}
