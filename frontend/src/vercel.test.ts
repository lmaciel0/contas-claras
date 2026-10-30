import { describe, expect, it } from 'vitest'
import vercel from '../vercel.json'

interface Regra {
  source: string
  headers: { key: string; value: string }[]
}

const regras = vercel.headers as Regra[]
const regraGlobal = regras.find((regra) => regra.source === '/(.*)')

function cabecalho(nome: string): string | undefined {
  return regraGlobal?.headers.find((h) => h.key.toLowerCase() === nome.toLowerCase())?.value
}

/** Diretivas da CSP como mapa `diretiva -> valor`. */
function diretivas(): Map<string, string> {
  const csp = cabecalho('Content-Security-Policy') ?? ''
  return new Map(
    csp
      .split(';')
      .map((parte) => parte.trim())
      .filter((parte) => parte !== '')
      .map((parte) => {
        const [nome = '', ...valor] = parte.split(/\s+/)
        return [nome, valor.join(' ')] as const
      }),
  )
}

describe('vercel.json: headers de segurança', () => {
  it('tem_regra_global_para_todas_as_rotas', () => {
    expect(regraGlobal).toBeDefined()
  })

  it('csp_so_libera_o_proprio_site_e_o_login_do_google', () => {
    const csp = diretivas()

    expect(csp.get('default-src')).toBe("'self'")
    expect(csp.get('script-src')).toBe("'self' https://accounts.google.com/gsi/client")
    expect(csp.get('frame-src')).toBe('https://accounts.google.com/gsi/')
    expect(csp.get('connect-src')).toBe("'self' https://accounts.google.com/gsi/")
    expect(csp.get('style-src')).toBe("'self' 'unsafe-inline' https://accounts.google.com/gsi/style")
    expect(csp.get('img-src')).toBe("'self' data: https:")
    expect(csp.get('font-src')).toBe("'self' data:")
    expect(csp.get('frame-ancestors')).toBe("'none'")
    expect(csp.get('base-uri')).toBe("'self'")
    expect(csp.get('form-action')).toBe("'self'")
    expect(csp.get('object-src')).toBe("'none'")
  })

  it('csp_nao_libera_script_inline_nem_eval', () => {
    expect(diretivas().get('script-src')).not.toMatch(/unsafe-inline|unsafe-eval/)
  })

  it('demais_headers', () => {
    expect(cabecalho('X-Content-Type-Options')).toBe('nosniff')
    expect(cabecalho('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(cabecalho('X-Frame-Options')).toBe('DENY')
  })

  it('mantem_o_header_de_cache_do_rewrite_da_api_e_os_rewrites', () => {
    const api = regras.find((regra) => regra.source === '/api/:path*')

    expect(api?.headers).toEqual([{ key: 'x-vercel-enable-rewrite-caching', value: '0' }])
    expect(vercel.rewrites.map((r) => r.source)).toEqual(['/api/(.*)', '/(.*)'])
  })
})
