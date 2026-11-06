import { useState } from 'react'
import { notificarNaoAutenticado } from '../api/cliente'

const CAMINHO = '/api/auth/conta/exportacao'
const NOME_PADRAO = 'aprumo-dados.json'
const MENSAGEM_DE_ERRO = 'Não foi possível exportar. Tente de novo.'
/** Tempo até liberar a URL do blob; dá folga para o navegador iniciar o download. */
const REVOGAR_APOS_MS = 1_000

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

/**
 * Baixa os dados da conta (`GET /api/auth/conta/exportacao`) como arquivo JSON, com o nome do `Content-Disposition`
 * (padrão `aprumo-dados.json`). Usa `fetch` direto porque o cliente `api` só devolve JSON, sem blob nem cabeçalhos.
 * Mantém o cookie (`same-origin`) e trata 401 como o resto do app (sessão expirada). Qualquer falha vira `erro`.
 */
export function useExportarDados(): { exportar: () => Promise<void>; exportando: boolean; erro: string | null } {
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function exportar(): Promise<void> {
    if (exportando) {
      return
    }
    setExportando(true)
    setErro(null)
    try {
      const resposta = await fetch(CAMINHO, { credentials: 'same-origin' })
      if (!resposta.ok) {
        if (resposta.status === 401) {
          notificarNaoAutenticado()
        }
        setErro(MENSAGEM_DE_ERRO)
        return
      }
      const blob = await resposta.blob()
      baixar(blob, nomeDoArquivo(resposta.headers.get('Content-Disposition')))
    } catch {
      setErro(MENSAGEM_DE_ERRO)
    } finally {
      setExportando(false)
    }
  }

  return { exportar, exportando, erro }
}
