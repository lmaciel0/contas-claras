import { Link, useNavigate, useParams } from 'react-router'
import { ErroApi } from '../../api/cliente'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Moldura } from '../lancamentos/Moldura'
import { EdicaoNota } from './EdicaoNota'
import { useCategoriasNota, useExcluirNota, useNota } from './useNotas'

/** Modal de edição `/notas/:id`. Nota inexistente ou de outra pessoa (404) mostra "Nota não encontrada.". */
export function NotaPage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const nota = useNota(id)
  const categorias = useCategoriasNota()
  const excluir = useExcluirNota()

  function fechar() {
    navegar('/notas')
  }

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
    <Moldura titulo="Editar nota" aoFechar={fechar} larguraMaxima="md:max-w-3xl">
      <h1 className="sr-only">Editar nota</h1>
      <Link to="/notas" className="sr-only">
        Voltar às notas
      </Link>
      {excluir.isError && (
        <p role="alert" className="m-0 text-xs text-[var(--cor-negativo-texto)]">
          {mensagemDoErro(excluir.error)}
        </p>
      )}
      {corpo}
    </Moldura>
  )
}
