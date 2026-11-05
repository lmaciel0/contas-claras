import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { VIGENCIA } from './responsavel'

/**
 * Layout comum das páginas legais públicas (política de privacidade e termos de uso). Fica fora da moldura logada e do
 * `LayoutAuth`, então abre igual para visitante e para quem já tem sessão. O conteúdo entra como filhos: use `<section>`
 * com `<h2>` para cada tópico.
 */
export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--cor-fundo)] px-4 py-8 text-[var(--cor-texto)]">
      <main className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link
          to="/"
          className="inline-flex min-h-11 w-fit items-center rounded-full px-1 text-sm font-semibold text-[var(--cor-principal)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Voltar ao Aprumo
        </Link>
        <article className="card flex flex-col gap-6 p-5 sm:p-8">
          <header className="flex flex-col gap-1">
            <h1 className="m-0 text-2xl font-bold">{titulo}</h1>
            <p className="m-0 text-sm text-[var(--cor-mutado)]">Vigência: {VIGENCIA}</p>
          </header>
          <div className="flex flex-col gap-6 text-base leading-relaxed [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1 [&_p]:m-0 [&_section]:flex [&_section]:flex-col [&_section]:gap-2 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-6">
            {children}
          </div>
        </article>
      </main>
    </div>
  )
}

/** Link de texto das páginas legais (e-mail, ANPD): sublinhado e foco visível. */
export function LinkLegal({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-sm font-semibold text-[var(--cor-principal)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
    >
      {children}
    </a>
  )
}
