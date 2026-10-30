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

/** Esperas entre tentativas quando o proxy responde 502/503/504 ou a conexão falha; a última se repete. */
const ESPERAS_ENTRE_TENTATIVAS_MS = [2_000, 3_000] as const
/** O proxy da Vercel responde estes status enquanto a API ainda está acordando. */
const STATUS_DE_PROXY_SEM_API = new Set([502, 503, 504])

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

/** Espera `ms` ou até o sinal abortar (o que vier primeiro); quem chama confere o sinal depois. */
function esperar(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    const terminar = () => {
      clearTimeout(temporizador)
      sinal.removeEventListener('abort', terminar)
      resolver()
    }
    const temporizador = setTimeout(terminar, ms)
    sinal.addEventListener('abort', terminar, { once: true })
  })
}

async function tratarResposta<T>(resposta: Response): Promise<T> {
  const corpo = await lerCorpo(resposta)
  if (!resposta.ok) {
    if (resposta.status === 401) {
      tratarNaoAutenticado?.()
    }
    throw new ErroApi(resposta.status, mensagemDoErro(corpo))
  }
  return corpo as T
}

/**
 * Chama a API. Sempre envia o cookie de sessão (`same-origin`) e, havendo corpo, `Content-Type: application/json`.
 * Erro HTTP vira `ErroApi` com a mensagem de `{erro}`; 401 também aciona o tratador de `aoNaoAutenticado`.
 *
 * Cold start da API: sem resposta em 3 s liga `servidorAcordando()`. Resposta 502/503/504 do proxy ou falha de
 * conexão são tentadas de novo (esperas de 2 s, depois 3 s), com o aviso ligado, até o limite de 90 s, quando
 * rejeita com `ErroApi` de `status` 0. Outros erros HTTP (inclusive 500) não são repetidos.
 */
export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const { signal: sinalDoChamador, ...restoDasOpcoes } = opcoes
  const headers = new Headers(restoDasOpcoes.headers)
  if (restoDasOpcoes.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Um único controlador cobre o limite de 90 s e o cancelamento de quem chamou
  // (sem AbortSignal.any, que falta no Safari < 17.4).
  const controle = new AbortController()
  const repassarAborto = () => controle.abort(sinalDoChamador?.reason)
  if (sinalDoChamador?.aborted) {
    repassarAborto()
  } else {
    sinalDoChamador?.addEventListener('abort', repassarAborto, { once: true })
  }

  let expirou = false
  let contadaComoLenta = false
  const ligarAviso = () => {
    if (!contadaComoLenta) {
      contadaComoLenta = true
      marcarChamadaLenta(1)
    }
  }
  const temporizadorAviso = setTimeout(ligarAviso, AVISO_APOS_MS)
  const temporizadorLimite = setTimeout(() => {
    expirou = true
    controle.abort()
  }, TIMEOUT_MS)

  try {
    for (let tentativa = 0; ; tentativa += 1) {
      controle.signal.throwIfAborted()

      let resposta: Response | null = null
      try {
        resposta = await fetch(caminho, {
          ...restoDasOpcoes,
          headers,
          credentials: 'same-origin',
          signal: controle.signal,
        })
      } catch (erro) {
        if (controle.signal.aborted || !(erro instanceof TypeError)) {
          throw erro
        }
        // falha de conexão (TypeError): tenta de novo abaixo
      }

      if (resposta !== null && !STATUS_DE_PROXY_SEM_API.has(resposta.status)) {
        return await tratarResposta<T>(resposta)
      }

      ligarAviso()
      const espera = ESPERAS_ENTRE_TENTATIVAS_MS[Math.min(tentativa, ESPERAS_ENTRE_TENTATIVAS_MS.length - 1)] ?? 3_000
      await esperar(espera, controle.signal)
    }
  } catch (erro) {
    if (erro instanceof ErroApi) {
      throw erro
    }
    if (expirou || erro instanceof TypeError) {
      throw new ErroApi(0, MENSAGEM_SEM_RESPOSTA)
    }
    throw erro // cancelado por quem chamou (ex.: TanStack Query); não é falha do servidor
  } finally {
    clearTimeout(temporizadorAviso)
    clearTimeout(temporizadorLimite)
    sinalDoChamador?.removeEventListener('abort', repassarAborto)
    if (contadaComoLenta) {
      marcarChamadaLenta(-1)
    }
  }
}
