import { Link, useNavigate, useParams } from 'react-router'
import { ErroApi } from '../../api/cliente'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { EdicaoNota } from './EdicaoNota'
import { useCategoriasNota, useExcluirNota, useNota } from './useNotas'

const linkVoltar =
  'inline-flex min-h-11 items-center self-start rounded-full px-2 text-sm font-semibold text-[var(--cor-principal)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

function Voltar() {
  return (
    <Link to="/notas" className={linkVoltar}>
      Voltar às notas
    </Link>
  )
}

/** Tela de edição `/notas/:id`. Nota inexistente ou de outra pessoa (404) mostra "Nota não encontrada.". */
export function NotaPage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const nota = useNota(id)
  const categorias = useCategoriasNota()
  const excluir = useExcluirNota()

  let corpo
  if (nota.isError) {
    const naoAchou = nota.error instanceof ErroApi && nota.error.status === 404
    corpo = (
      <p role={naoAchou ? undefined : 'alert'} className="card m-0 text-sm text-[var(--cor-mutado)]">
        {naoAchou ? 'Nota não encontrada.' : mensagemDoErro(nota.error)}
      </p>
    )
  } else if (nota.data === undefined || excluir.isPending || excluir.isSuccess) {
    corpo = (
      <div aria-hidden="true" className="flex flex-col gap-3 motion-safe:animate-pulse">
        <div className="h-11 w-2/3 rounded-xl bg-[var(--cor-card)]" />
        <div className="h-64 rounded-[var(--raio-card)] bg-[var(--cor-card)]" />
      </div>
    )
  } else {
    corpo = (
      <EdicaoNota
        key={nota.data.id}
        nota={nota.data}
        categorias={categorias.data ?? []}
        excluindo={excluir.isPending}
        aoExcluir={() => excluir.mutate(id, { onSuccess: () => navegar('/notas') })}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3">
      <h1 className="sr-only">Editar nota</h1>
      <Voltar />
      {excluir.isError && (
        <p role="alert" className="m-0 text-xs text-[var(--cor-negativo-texto)]">
          {mensagemDoErro(excluir.error)}
        </p>
      )}
      {corpo}
    </div>
  )
}
