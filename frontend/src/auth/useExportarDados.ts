import { useState } from 'react'
import { api, ErroApi } from '../api/cliente'

const CAMINHO = '/api/auth/conta/exportacao'
const NOME_PADRAO = 'aprumo-dados.json'
const MENSAGEM_DE_ERRO = 'Não foi possível exportar. Tente de novo.'
const MENSAGEM_DE_LIMITE = 'Aguarde alguns segundos e tente de novo.'
const STATUS_LIMITE_EXCEDIDO = 429
/** Tempo até liberar a URL do blob; dá folga para o navegador (ou o app Android) iniciar o download. */
const REVOGAR_APOS_MS = 30_000

/** O nome do `Content-Disposition: attachment; filename="..."`, ou o padrão se faltar ou vier vazio. */
function nomeDoArquivo(contentDisposition: string | null): string {
  const nome = /filename="?([^";]+)"?/i.exec(contentDisposition ?? '')?.[1]?.trim()
  return nome ? nome : NOME_PADRAO
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOGAR_APOS_MS)
}

function mensagemDaFalha(erro: unknown): string {
  return erro instanceof ErroApi && erro.status === STATUS_LIMITE_EXCEDIDO ? MENSAGEM_DE_LIMITE : MENSAGEM_DE_ERRO
}

/**
 * Baixa os dados da conta (`GET /api/auth/conta/exportacao`) como arquivo JSON, com o nome do `Content-Disposition`
 * (padrão `aprumo-dados.json`). Usa `api(..., { formato: 'blob' })`: cookie, retry de cold start, limite de 90 s e 401
 * (sessão expirada) como no resto do app. Resposta que não seja `application/json` conta como erro, e 429 pede para
 * aguardar. `exportado` fica `true` depois de um download bem-sucedido e volta a `false` na próxima tentativa.
 */
export function useExportarDados(): {
  exportar: () => Promise<void>
  exportando: boolean
  erro: string | null
  exportado: boolean
} {
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [exportado, setExportado] = useState(false)

  async function exportar(): Promise<void> {
    if (exportando) {
      return
    }
    setExportando(true)
    setErro(null)
    setExportado(false)
    try {
      const { blob, headers } = await api(CAMINHO, { formato: 'blob' })
      if (!(headers.get('Content-Type') ?? '').toLowerCase().includes('application/json')) {
        setErro(MENSAGEM_DE_ERRO)
        return
      }
      baixar(blob, nomeDoArquivo(headers.get('Content-Disposition')))
      setExportado(true)
    } catch (falha) {
      setErro(mensagemDaFalha(falha))
    } finally {
      setExportando(false)
    }
  }

  return { exportar, exportando, erro, exportado }
}
