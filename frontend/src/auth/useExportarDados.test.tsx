import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aoNaoAutenticado } from '../api/cliente'
import { servidor } from '../teste/servidor'
import { useExportarDados } from './useExportarDados'

const MENSAGEM_DE_ERRO = 'Não foi possível exportar. Tente de novo.'
const MENSAGEM_DE_LIMITE = 'Aguarde alguns segundos e tente de novo.'

function Sonda() {
  const { exportar, exportando, erro, exportado } = useExportarDados()
  return (
    <div>
      <button onClick={() => void exportar()} aria-disabled={exportando}>
        exportar
      </button>
      <p data-testid="erro">{erro ?? ''}</p>
      <p data-testid="exportado">{String(exportado)}</p>
    </div>
  )
}

function respostaDeExportacao(nomeDoArquivo: string | null = 'aprumo-dados-2026-11-06.json') {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (nomeDoArquivo !== null) {
    headers['Content-Disposition'] = `attachment; filename="${nomeDoArquivo}"`
  }
  return HttpResponse.json({ geradoEm: '2026-11-06T10:00:00Z' }, { headers })
}

describe('useExportarDados', () => {
  let cliques: { download: string; href: string }[]
  let criarUrl: ReturnType<typeof vi.fn>
  let revogarUrl: ReturnType<typeof vi.fn>

  beforeEach(() => {
    cliques = []
    criarUrl = vi.fn(() => 'blob:aprumo/exportacao')
    revogarUrl = vi.fn()
    URL.createObjectURL = criarUrl as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revogarUrl as unknown as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      cliques.push({ download: this.download, href: this.href })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('o_clique_chama_a_API_e_baixa_o_arquivo_com_o_nome_do_cabecalho', async () => {
    let chamadas = 0
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => {
        chamadas += 1
        return respostaDeExportacao('aprumo-dados-2026-11-06.json')
      }),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    await waitFor(() => expect(cliques).toHaveLength(1))
    expect(chamadas).toBe(1)
    expect(cliques[0]?.download).toBe('aprumo-dados-2026-11-06.json')
    expect(cliques[0]?.href).toBe('blob:aprumo/exportacao')
    expect(criarUrl).toHaveBeenCalledTimes(1)
    // o Blob da resposta vem do undici, outro realm que o do jsdom: confere pelo conteúdo, não pela classe
    const blob = criarUrl.mock.calls[0]?.[0] as Blob
    expect(JSON.parse(await blob.text())).toEqual({ geradoEm: '2026-11-06T10:00:00Z' })
    expect(screen.getByTestId('erro')).toHaveTextContent('')
    expect(screen.getByTestId('exportado')).toHaveTextContent('true')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('sem_Content_Disposition_usa_o_nome_padrao', async () => {
    servidor.use(http.get('/api/auth/conta/exportacao', () => respostaDeExportacao(null)))
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    await waitFor(() => expect(cliques).toHaveLength(1))
    expect(cliques[0]?.download).toBe('aprumo-dados.json')
  })

  it('no_500_mostra_a_mensagem_de_erro_e_nao_baixa_nada', async () => {
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => HttpResponse.json({ erro: 'Falha interna.' }, { status: 500 })),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    expect(await screen.findByTestId('erro')).toHaveTextContent(MENSAGEM_DE_ERRO)
    expect(screen.getByTestId('exportado')).toHaveTextContent('false')
    expect(cliques).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'exportar' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('503_da_propria_API_mostra_a_mensagem_de_erro_sem_retentativa', async () => {
    // Falha de rede e 502/504 do proxy são repetidas pelo cliente por até 90 s (cold start); 503 com {erro} não.
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => HttpResponse.json({ erro: 'Indisponível.' }, { status: 503 })),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    expect(await screen.findByTestId('erro')).toHaveTextContent(MENSAGEM_DE_ERRO)
  })

  it('o_botao_fica_desabilitado_durante_a_exportacao', async () => {
    let liberar: () => void = () => {}
    const portao = new Promise<void>((resolver) => {
      liberar = resolver
    })
    servidor.use(
      http.get('/api/auth/conta/exportacao', async () => {
        await portao
        return respostaDeExportacao()
      }),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))
    expect(screen.getByRole('button', { name: 'exportar' })).toHaveAttribute('aria-disabled', 'true')

    await act(async () => {
      liberar()
      await portao
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'exportar' })).toHaveAttribute('aria-disabled', 'false'))
    expect(cliques).toHaveLength(1)
  })

  it('no_401_aciona_o_tratador_de_sessao_expirada_como_o_resto_do_app', async () => {
    const aoExpirar = vi.fn()
    const desfazer = aoNaoAutenticado(aoExpirar)
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    await waitFor(() => expect(aoExpirar).toHaveBeenCalledTimes(1))
    expect(cliques).toHaveLength(0)
    desfazer()
  })

  it('uma_nova_tentativa_limpa_o_erro_anterior', async () => {
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => HttpResponse.json({ erro: 'x' }, { status: 500 }), { once: true }),
      http.get('/api/auth/conta/exportacao', () => respostaDeExportacao()),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))
    expect(await screen.findByTestId('erro')).toHaveTextContent(MENSAGEM_DE_ERRO)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    await waitFor(() => expect(cliques).toHaveLength(1))
    expect(screen.getByTestId('erro')).toHaveTextContent('')
  })

  it('no_429_pede_para_aguardar_alguns_segundos', async () => {
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => HttpResponse.json({ erro: 'Muitas.' }, { status: 429 })),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    expect(await screen.findByTestId('erro')).toHaveTextContent(MENSAGEM_DE_LIMITE)
    expect(cliques).toHaveLength(0)
  })

  it('resposta_que_nao_e_json_vira_erro_e_nao_baixa_nada', async () => {
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => new HttpResponse('<html></html>', { headers: { 'Content-Type': 'text/html' } })),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))

    expect(await screen.findByTestId('erro')).toHaveTextContent(MENSAGEM_DE_ERRO)
    expect(cliques).toHaveLength(0)
    expect(criarUrl).not.toHaveBeenCalled()
  })

  it('libera_a_URL_do_blob_so_depois_de_30_segundos', async () => {
    servidor.use(http.get('/api/auth/conta/exportacao', () => respostaDeExportacao()))
    const agendar = vi.spyOn(globalThis, 'setTimeout')
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))
    await waitFor(() => expect(cliques).toHaveLength(1))

    expect(agendar.mock.calls.some(([, ms]) => ms === 30_000)).toBe(true)
    expect(revogarUrl).not.toHaveBeenCalled()
  })

  it('o_segundo_clique_durante_a_exportacao_e_ignorado', async () => {
    let liberar: () => void = () => {}
    const portao = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.get('/api/auth/conta/exportacao', async () => {
        chamadas += 1
        await portao
        return respostaDeExportacao()
      }),
    )
    render(<Sonda />)

    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))
    await userEvent.click(screen.getByRole('button', { name: 'exportar' }))
    await act(async () => {
      liberar()
      await portao
    })

    await waitFor(() => expect(cliques).toHaveLength(1))
    expect(chamadas).toBe(1)
  })
})
