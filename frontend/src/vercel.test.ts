import { describe, expect, it } from 'vitest'

interface Regra {
  source: string
  headers: { key: string; value: string }[]
}

interface Rewrite {
  source: string
  destination: string | { service: string }
}

interface Servico {
  root: string
  framework?: string
  runtime?: string
  entrypoint?: string
  rewrites?: Rewrite[]
}

interface Transform {
  type: string
  op: string
  target: { key: string }
  args: string
  env?: string[]
}

interface Rota {
  src: string
  dest: string
  transforms?: Transform[]
}

interface ConfigVercel {
  regions: string[]
  services: Record<string, Servico>
  rewrites: Rewrite[]
  routes: Rota[]
  headers: Regra[]
}

// O vercel.json fica na raiz do repo (projeto único com Services). Lido por glob, e não por import,
// para o `tsc -b` do build do serviço `web` (que parte de frontend/) não depender de um arquivo fora dele.
const arquivos = import.meta.glob<ConfigVercel>('../../vercel.json', {
  eager: true,
  import: 'default',
})
const vercel = Object.values(arquivos)[0] as ConfigVercel

const regras = vercel.headers
const regraGlobal = regras.find((regra) => regra.source === '/(.*)')
const regraApi = regras.find((regra) => regra.source === '/api/(.*)')

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
  it('le_o_vercel_json_da_raiz_do_repo', () => {
    expect(Object.keys(arquivos)).toHaveLength(1)
  })

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

  it('hsts_de_um_ano_sem_preload', () => {
    const hsts = cabecalho('Strict-Transport-Security')

    expect(hsts).toBe('max-age=31536000')
    expect(hsts).not.toMatch(/preload|includeSubDomains/i)
  })

  it('permissions_policy_bloqueia_camera_microfone_geolocalizacao_e_pagamento', () => {
    expect(cabecalho('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), payment=()')
  })

  it('api_nunca_e_cacheada_no_cdn', () => {
    expect(regraApi?.headers).toEqual([{ key: 'Cache-Control', value: 'no-store' }])
  })
})

describe('vercel.json: projeto com Vercel Services', () => {
  it('web_e_o_front_estatico_em_frontend', () => {
    expect(vercel.services['web']).toMatchObject({ root: 'frontend/', framework: 'vite' })
  })

  it('web_tem_fallback_de_spa_para_o_index', () => {
    expect(vercel.services['web']?.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
  })

  it('nao_tem_mais_o_service_api', () => {
    expect(Object.keys(vercel.services)).toEqual(['web'])
  })

  it('rewrites_manda_tudo_ao_web', () => {
    expect(vercel.rewrites).toEqual([{ source: '/(.*)', destination: { service: 'web' } }])
  })

  it('tem_uma_unica_rota_repassando_api_ao_render', () => {
    expect(vercel.routes).toHaveLength(1)
    expect(vercel.routes[0]).toMatchObject({
      src: '/api/(.*)',
      dest: 'https://api.useaprumo.com.br/api/$1',
    })
  })

  it('rota_da_api_seta_o_cabecalho_de_origem_a_partir_da_variavel', () => {
    expect(vercel.routes[0]?.transforms).toEqual([
      {
        type: 'request.headers',
        op: 'set',
        target: { key: 'X-Aprumo-Origem' },
        args: '$ORIGEM_SEGREDO',
        env: ['ORIGEM_SEGREDO'],
      },
    ])
  })

  it('segredo_de_origem_nunca_aparece_em_claro', () => {
    expect(JSON.stringify(vercel)).not.toMatch(/[0-9a-fA-F]{32,}/)
  })

  it('roda_na_regiao_de_sao_paulo', () => {
    expect(vercel.regions).toEqual(['gru1'])
  })

  it('nao_usa_chaves_proibidas_no_modo_services', () => {
    const topo = Object.keys(vercel)

    for (const chave of ['functions', 'installCommand', 'buildCommand', 'devCommand', 'outputDirectory', 'framework']) {
      expect(topo).not.toContain(chave)
    }
  })

  it('nao_expoe_a_url_tecnica_do_render', () => {
    expect(JSON.stringify(vercel)).not.toContain('onrender.com')
  })

  it('nao_sobrou_vercel_json_dentro_de_frontend', () => {
    expect(Object.keys(import.meta.glob('../vercel.json'))).toEqual([])
  })
})
