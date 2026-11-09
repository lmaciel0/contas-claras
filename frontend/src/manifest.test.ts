import { describe, expect, it } from 'vitest'

// Lido como texto, por glob, no mesmo estilo do index-html.test.ts (sem depender de DOM do navegador).
const arquivos = import.meta.glob<string>('../public/manifest.webmanifest', {
  eager: true,
  query: '?raw',
  import: 'default',
})

interface Icone {
  src: string
  sizes: string
  type: string
  purpose?: string
}

interface Atalho {
  name: string
  url: string
  icons?: Icone[]
}

interface Manifest {
  id?: string
  name?: string
  description?: string
  lang?: string
  theme_color?: string
  categories?: string[]
  icons?: Icone[]
  shortcuts?: Atalho[]
}

const manifest = JSON.parse(Object.values(arquivos)[0] as string) as Manifest

const arquivosPublicos = import.meta.glob('../public/*.png')

function existeNoPublic(src: string): boolean {
  return `../public${src}` in arquivosPublicos
}

describe('manifest.webmanifest', () => {
  it('identifica o app pela raiz e usa idioma e cor do tema', () => {
    expect(manifest.id).toBe('/')
    expect(manifest.lang).toBe('pt-BR')
    expect(manifest.theme_color).toBe('#27187E')
  })

  it('descreve o app atual, sem promessa de futuro, citando finanças e notas', () => {
    const descricao = (manifest.description ?? '').toLowerCase()
    expect(descricao).not.toContain('em breve')
    for (const termo of ['finanças', 'notas']) {
      expect(descricao).toContain(termo)
    }
    for (const termo of ['tarefas', 'projetos']) {
      expect(descricao).not.toContain(termo)
    }
  })

  it('declara as categorias finance e productivity', () => {
    expect(manifest.categories).toEqual(expect.arrayContaining(['finance', 'productivity']))
  })

  it('tem ícones any de 192 e 512 que existem em public/', () => {
    const any = (manifest.icons ?? []).filter((i) => i.purpose === undefined || i.purpose === 'any')
    expect(any.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    for (const icone of any) expect(existeNoPublic(icone.src)).toBe(true)
  })

  it('tem ícone maskable próprio, que existe em public/ e não reusa o ícone any', () => {
    const maskable = (manifest.icons ?? []).filter((i) => i.purpose === 'maskable')
    expect(maskable).toHaveLength(1)
    expect(maskable[0]?.src).toBe('/icon-maskable-512.png')
    expect(maskable[0]?.sizes).toBe('512x512')
    expect(existeNoPublic('/icon-maskable-512.png')).toBe(true)
  })

  it('tem atalhos Nova nota e Nova conta para rotas que existem', () => {
    const atalhos = Object.fromEntries((manifest.shortcuts ?? []).map((a) => [a.name, a.url]))
    expect(atalhos['Nova nota']).toBe('/notas')
    expect(atalhos['Nova conta']).toBe('/lancamentos/novo')
  })

  it('dá a cada atalho o ícone de 192 que existe em public/', () => {
    expect(manifest.shortcuts).toHaveLength(2)
    for (const atalho of manifest.shortcuts ?? []) {
      expect(atalho.icons).toEqual([{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }])
      for (const icone of atalho.icons ?? []) expect(existeNoPublic(icone.src)).toBe(true)
    }
  })
})
