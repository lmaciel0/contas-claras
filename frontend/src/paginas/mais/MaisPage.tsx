import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { foco } from '../../layout/classesFoco'
import { useContextoShell } from '../../layout/contextoShell'
import {
  ICONE_ENGRENAGEM,
  ICONE_EXCLUIR,
  ICONE_PRIVACIDADE,
  ICONE_SAIR,
  ICONE_SENHA,
  ICONE_SETA_DIREITA,
  ICONES,
} from '../../layout/icones'
import { ITENS_MAIS } from '../../layout/itensMenu'
import { useMesSelecionado } from '../../layout/useMesSelecionado'

const linha = `flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-[15px] font-semibold no-underline transition-colors duration-200 ease-out hover:bg-[var(--cor-fundo)] motion-reduce:transition-none ${foco} focus-visible:-outline-offset-2`

const cartao = 'overflow-hidden rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)]'

const divisor = 'divide-y divide-[var(--cor-linha)]'

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="m-0 px-1 text-xs font-bold tracking-wide text-[var(--cor-mutado)] uppercase">{titulo}</h2>
      <div className={`${cartao} ${divisor}`}>{children}</div>
    </section>
  )
}

function Seta() {
  return <span className="ml-auto shrink-0 text-[var(--cor-mutado)]">{ICONE_SETA_DIREITA}</span>
}

/**
 * Página "Mais" (celular): tudo que não cabe na dock inferior. Atalhos (Tarefas, Projetos, Visão geral, Cartões,
 * Categorias, Relatórios), conta (Preferências, senha, exclusão, privacidade) e Sair, em cartões agrupados.
 * As ações vêm do AppShell pelo contexto do `<Outlet>`.
 */
export function MaisPage() {
  const { nomeUsuario, aoSair, aoAbrirPreferencias } = useContextoShell()
  const { busca } = useMesSelecionado()
  const inicial = nomeUsuario?.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mais</h1>

      <div className={`${cartao} flex items-center gap-3 p-4`}>
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--cor-principal)] text-base font-bold text-[var(--cor-sobre-principal)]"
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--cor-texto)]">{nomeUsuario}</span>
      </div>

      <Grupo titulo="Atalhos">
        {ITENS_MAIS.map((item) => (
          <Link
            key={item.caminho}
            to={{ pathname: item.caminho, search: item.comMes ? busca : '' }}
            className={`${linha} text-[var(--cor-texto)]`}
          >
            {ICONES[item.caminho]}
            <span>{item.rotulo}</span>
            <Seta />
          </Link>
        ))}
      </Grupo>

      <Grupo titulo="Conta">
        <button type="button" onClick={aoAbrirPreferencias} className={`${linha} cursor-pointer text-[var(--cor-texto)]`}>
          {ICONE_ENGRENAGEM}
          <span>Preferências</span>
          <Seta />
        </button>
        <Link to="/conta/senha" className={`${linha} text-[var(--cor-texto)]`}>
          {ICONE_SENHA}
          <span>Alterar senha</span>
          <Seta />
        </Link>
        <Link to="/conta/excluir" className={`${linha} text-[var(--cor-texto)]`}>
          {ICONE_EXCLUIR}
          <span>Excluir conta</span>
          <Seta />
        </Link>
        <Link to="/privacidade" className={`${linha} text-[var(--cor-texto)]`}>
          {ICONE_PRIVACIDADE}
          <span>Política de Privacidade</span>
          <Seta />
        </Link>
      </Grupo>

      <button
        type="button"
        onClick={aoSair}
        className={`${cartao} ${linha} cursor-pointer justify-center text-[var(--cor-negativo)] hover:bg-[var(--cor-erro-fundo)]`}
      >
        {ICONE_SAIR}
        <span>Sair</span>
      </button>
    </div>
  )
}
