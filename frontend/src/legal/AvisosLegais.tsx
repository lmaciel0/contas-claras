import type { ReactNode } from 'react'
import { LinkLegal } from './PaginaLegal'

/**
 * Frase de ciência "Ao {acao}, você declara ter lido a Política de Privacidade e os Termos de Uso." com os dois links
 * em nova aba. Os links são inline numa frase (exceção do alvo mínimo da WCAG 2.5.8), por isso sem `min-h-11`.
 */
export function AvisoCiencia({ acao, testId }: { acao: string; testId: string }): ReactNode {
  return (
    <p data-testid={testId} className="m-0 text-center text-xs leading-relaxed text-[var(--cor-mutado)]">
      Ao {acao}, você declara ter lido a{' '}
      <LinkLegal href="/privacidade" novaAba>
        Política de Privacidade
      </LinkLegal>{' '}
      e os{' '}
      <LinkLegal href="/termos" novaAba>
        Termos de Uso
      </LinkLegal>
      .
    </p>
  )
}

/** Rodapé das telas de auth e do menu: os dois documentos sempre à mão, em nova aba. */
export function RodapeLegal() {
  return (
    <nav aria-label="Documentos legais" className="flex flex-wrap items-center justify-center gap-x-4 text-xs">
      <LinkLegal href="/privacidade" novaAba className="inline-flex min-h-11 items-center px-1">
        Política de Privacidade
      </LinkLegal>
      <LinkLegal href="/termos" novaAba className="inline-flex min-h-11 items-center px-1">
        Termos de Uso
      </LinkLegal>
    </nav>
  )
}
