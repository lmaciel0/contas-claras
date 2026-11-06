/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface Regra {
  source: string
  headers: { key: string; value: string }[]
}

interface Relacao {
  relation: string[]
  target: {
    namespace: string
    package_name: string
    sha256_cert_fingerprints: string[]
  }
}

interface ManifestoTwa {
  packageId: string
  host: string
  startUrl: string
  themeColor: string
  display: string
  minSdkVersion: number
  signingKey: { path: string; alias: string }
}

const raiz = resolve(process.cwd(), '..')

function ler(caminho: string): string {
  return readFileSync(resolve(raiz, caminho), 'utf8')
}

const textoAssetlinks = ler('frontend/public/.well-known/assetlinks.json')
const textoVercel = ler('vercel.json')
const textoGitignore = ler('.gitignore')
const textoTwa = ler('android/twa-manifest.json')

const assetlinks = JSON.parse(textoAssetlinks) as Relacao[]
const vercel = JSON.parse(textoVercel) as { headers: Regra[] }
const twa = JSON.parse(textoTwa) as ManifestoTwa
const linhasGitignore = textoGitignore.split('\n').map((linha) => linha.trim())

describe('assetlinks.json (Digital Asset Links)', () => {
  it('e_um_array_com_uma_relacao_handle_all_urls', () => {
    expect(Array.isArray(assetlinks)).toBe(true)
    expect(assetlinks).toHaveLength(1)
    expect(assetlinks[0]?.relation).toEqual(['delegate_permission/common.handle_all_urls'])
  })

  it('aponta_para_o_app_android_do_aprumo', () => {
    expect(assetlinks[0]?.target.namespace).toBe('android_app')
    expect(assetlinks[0]?.target.package_name).toBe('br.com.useaprumo.app')
  })

  it('tem_ao_menos_um_fingerprint_sha256_valido_em_maiusculas_com_dois_pontos', () => {
    const fingerprints = assetlinks[0]?.target.sha256_cert_fingerprints ?? []

    expect(fingerprints.length).toBeGreaterThanOrEqual(1)
    for (const fingerprint of fingerprints) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
    }
  })

  it('inclui_o_fingerprint_da_chave_de_upload', () => {
    expect(assetlinks[0]?.target.sha256_cert_fingerprints).toContain(
      'C9:62:B2:67:40:9F:23:48:F4:F8:4B:12:6C:3F:55:22:A7:8A:CA:2A:24:CD:FC:C4:9E:A6:45:C9:2D:D8:61:D1',
    )
  })

  it('nao_repete_fingerprint', () => {
    const fingerprints = assetlinks[0]?.target.sha256_cert_fingerprints ?? []

    expect(new Set(fingerprints).size).toBe(fingerprints.length)
  })
})

describe('vercel.json: assetlinks', () => {
  const regra = vercel.headers.find((r) => r.source === '/.well-known/assetlinks.json')

  it('serve_o_assetlinks_como_application_json', () => {
    expect(regra?.headers).toEqual([{ key: 'Content-Type', value: 'application/json' }])
  })

  it('nao_altera_a_regra_global_de_seguranca', () => {
    const global = vercel.headers.find((r) => r.source === '/(.*)')
    const chaves = global?.headers.map((h) => h.key)

    expect(chaves).toContain('Content-Security-Policy')
    expect(chaves).not.toContain('Content-Type')
  })
})

describe('.gitignore: material do projeto Android', () => {
  it.each([
    'android/*.keystore',
    'android/*.jks',
    'android/build/',
    'android/*.aab',
    'android/*.apk',
    'android/local.properties',
    'android/node_modules/',
  ])('ignora_%s', (linha) => {
    expect(linhasGitignore).toContain(linha)
  })
})

function ignorado(caminho: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', caminho], { cwd: raiz, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe('.gitignore: chaves e artefatos em qualquer pasta (git check-ignore real)', () => {
  it.each([
    'keystore.jks',
    'upload.jks',
    'aprumo.keystore',
    'chave.p12',
    'app-release.aab',
    'app-release.apk',
    'android/aprumo-upload.jks',
    'android/sub/x.jks',
    'android/app/release.jks',
    'android/build/saida.txt',
    'android/app/build/outputs/x.txt',
    'android/app/app-release.aab',
    'android/x/y.apk',
    'android/.gradle/cache.bin',
    'android/local.properties',
    'android/app/local.properties',
    'android/key.properties',
    'android/app/key.properties',
    'android/signing.properties',
    'android/app/signing.properties',
  ])('ignora_%s', (caminho) => {
    expect(ignorado(caminho)).toBe(true)
  })

  it.each([
    'android/app/src/main/AndroidManifest.xml',
    'android/gradle/wrapper/gradle-wrapper.properties',
    'android/gradlew',
    'android/gradlew.bat',
    'android/build.gradle',
    'android/settings.gradle',
    'android/gradle.properties',
    'android/manifest-checksum.txt',
    'android/store_icon.png',
  ])('ignora_o_projeto_gradle_gerado_%s', (caminho) => {
    expect(ignorado(caminho)).toBe(true)
  })

  it.each(['android/twa-manifest.json', 'android/README.md', 'frontend/public/.well-known/assetlinks.json'])(
    'nao_ignora_%s',
    (caminho) => {
      expect(ignorado(caminho)).toBe(false)
    },
  )

  it('nenhum_arquivo_versionado_e_chave_ou_pacote_android', () => {
    const versionados = execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8' }).split('\n')

    expect(versionados.filter((arquivo) => /\.(jks|keystore|p12|aab|apk)$/.test(arquivo))).toEqual([])
  })
})

describe('android/twa-manifest.json', () => {
  it('usa_o_pacote_e_o_host_do_aprumo', () => {
    expect(twa.packageId).toBe('br.com.useaprumo.app')
    expect(twa.host).toBe('app.useaprumo.com.br')
    expect(twa.startUrl).toBe('/')
    expect(twa.themeColor).toBe('#27187E')
    expect(twa.display).toBe('standalone')
  })

  it('usa_minSdkVersion_24_ou_maior', () => {
    expect(twa.minSdkVersion).toBeGreaterThanOrEqual(24)
  })

  it('nao_tem_caminho_pessoal_absoluto', () => {
    expect(textoTwa).not.toContain('/home/')
  })

  it('aponta_para_keystore_por_caminho_relativo', () => {
    expect(twa.signingKey.path.startsWith('./')).toBe(true)
    expect(twa.signingKey.path).not.toMatch(/^\/|^[A-Za-z]:\\|^~/)
    expect(twa.signingKey.alias).toBe('aprumo-upload')
  })
})
