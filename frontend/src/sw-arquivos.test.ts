import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Lidos do disco como texto (o glob do Vite não enxerga .js e .html dentro de public/). O vitest roda com cwd em frontend/.
function ler(nome: string): string {
  return readFileSync(resolve(process.cwd(), 'public', nome), 'utf8')
}
const sw = ler('sw.js')
const offline = ler('offline.html')

describe('public/sw.js', () => {
  it('existe', () => {
    expect(sw).toBeTruthy()
  })

  it('guarda_em_cache_so_a_pagina_offline_e_o_icone', () => {
    expect(sw).toContain("'aprumo-offline-v1'")
    expect(sw).toContain("'/offline.html'")
    expect(sw).toContain("'/icon-192.png'")
    expect(sw).not.toContain("'/index.html'")
    expect(sw).not.toMatch(/\.js'/)
  })

  it('so_intercepta_navegacao_e_nao_toca_em_api', () => {
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).not.toContain('/api')
  })

  it('sem_cache_devolve_erro_de_rede_em_vez_de_undefined', () => {
    expect(sw).toContain('Response.error()')
  })

  it('avisa_para_subir_a_versao_do_cache_ao_mudar_os_arquivos', () => {
    expect(sw).toMatch(/offline\.html ou icon-192\.png, subir a versão do cache/)
  })

  it('ativa_na_hora_limpa_caches_antigos_e_assume_as_abas', () => {
    expect(sw).toContain('skipWaiting')
    expect(sw).toContain('clients.claim')
    expect(sw).toContain('caches.delete')
  })
})

describe('public/offline.html', () => {
  it('nao_tem_script_porque_a_csp_bloqueia', () => {
    expect(offline).toBeTruthy()
    expect(offline).not.toMatch(/<script/i)
  })

  it('mostra_os_textos_e_o_link_que_recarrega_a_mesma_rota', () => {
    expect(offline).toContain('Sem conexão')
    expect(offline).toContain('O Aprumo precisa de internet para mostrar seus dados.')
    expect(offline).toMatch(/<a [^>]*href=""[^>]*>\s*Tentar de novo\s*<\/a>/)
    expect(offline).toContain('/icon-192.png')
  })

  it('so_tema_claro_porque_sem_script_nao_le_o_tema_salvo', () => {
    expect(offline).not.toContain('prefers-color-scheme')
  })

  it('tem_alvo_de_toque_de_44px_e_respeita_movimento_reduzido', () => {
    expect(offline).toMatch(/min-height:\s*44px/)
    expect(offline).toContain('prefers-reduced-motion')
  })
})
