import { Link } from 'react-router'

/** Rota curinga (`*`): endereço que não existe. Fica dentro da moldura, então a navegação continua à mão. */
export function NaoEncontradaPage() {
  return (
    <section className="card mx-auto mt-6 flex max-w-md flex-col items-center gap-3 p-6 text-center sm:p-8">
      <h1 className="m-0 text-xl font-bold">Página não encontrada</h1>
      <p className="m-0 text-sm text-[var(--cor-mutado)]">O endereço que você abriu não existe ou foi movido.</p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-[var(--cor-principal)] px-5 py-2.5 text-sm font-semibold text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
      >
        Voltar para o início
      </Link>
    </section>
  )
}
