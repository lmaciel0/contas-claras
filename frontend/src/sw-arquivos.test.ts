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

  it('mostra_os_textos_e_o_link_para_a_raiz', () => {
    expect(offline).toContain('Sem conexão')
    expect(offline).toContain('O Aprumo precisa de internet para mostrar seus dados.')
    expect(offline).toMatch(/<a [^>]*href="\/"[^>]*>\s*Tentar de novo\s*<\/a>/)
    expect(offline).toContain('/icon-192.png')
  })

  it('suporta_tema_escuro_e_alvo_de_toque_de_44px', () => {
    expect(offline).toContain('prefers-color-scheme: dark')
    expect(offline).toMatch(/min-height:\s*44px/)
    expect(offline).toContain('prefers-reduced-motion')
  })
})
