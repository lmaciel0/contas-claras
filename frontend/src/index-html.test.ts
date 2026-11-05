import { describe, expect, it } from 'vitest'

// Lido como texto, por glob, no mesmo estilo do vercel.test.ts (sem depender de DOM do navegador).
const arquivos = import.meta.glob<string>('../index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const html = Object.values(arquivos)[0] as string

const imagens = import.meta.glob('../public/og.png')

const ORIGEM = 'https://app.useaprumo.com.br'

/** Valor do atributo `content` da meta com o atributo-chave dado (`name` ou `property`). */
function meta(chave: 'name' | 'property', nome: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/g) ?? []
  for (const tag of tags) {
    if (new RegExp(`${chave}="${nome}"`).test(tag)) {
      return /content="([^"]*)"/.exec(tag)?.[1]
    }
  }
  return undefined
}

describe('index.html: metadados', () => {
  it('le_o_index_html', () => {
    expect(Object.keys(arquivos)).toHaveLength(1)
  })

  it('site_todo_fica_fora_dos_buscadores', () => {
    expect(meta('name', 'robots')).toBe('noindex')
  })

  it('descricao_do_assistente_pessoal', () => {
    expect(meta('name', 'description')).toBe(
      'Aprumo: seu assistente pessoal com finanças, tarefas, notas e projetos no mesmo lugar.',
    )
  })

  it('preserva_as_metas_existentes', () => {
    expect(meta('name', 'theme-color')).toBe('#27187E')
    expect(meta('name', 'viewport')).toContain('width=device-width')
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<title>Aprumo</title>')
  })

  it('tem_tags_open_graph_com_url_absoluta', () => {
    expect(meta('property', 'og:title')).toBe('Aprumo')
    expect(meta('property', 'og:description')).toBe(meta('name', 'description'))
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:url')).toBe(`${ORIGEM}/`)
    expect(meta('property', 'og:image')).toBe(`${ORIGEM}/og.png`)
  })

  it('twitter_card_com_imagem_grande', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
  })

  it('imagem_de_compartilhamento_existe_em_public', () => {
    expect(Object.keys(imagens)).toHaveLength(1)
  })
})
