import { useState } from 'react'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { CadastroPage } from './auth/CadastroPage'
import { DefinirSenhaPage } from './auth/DefinirSenhaPage'
import { LoginPage } from './auth/LoginPage'
import { RotaProtegida } from './auth/RotaProtegida'
import { useAuth } from './auth/useAuth'
import { AppShell } from './layout/AppShell'
import { CartoesPage } from './paginas/cartoes/CartoesPage'
import { CategoriasPage } from './paginas/categorias/CategoriasPage'
import { InicioPage } from './paginas/inicio/InicioPage'
import { LancamentoForm } from './paginas/lancamentos/LancamentoForm'
import { LancamentosPage } from './paginas/lancamentos/LancamentosPage'

function EmBreve({ titulo }: { titulo: string }): ReactNode {
  return (
    <section className="card">
      <h1 className="m-0 text-xl font-bold">{titulo}</h1>
      <p className="mt-2 mb-0 text-sm text-[var(--cor-mutado)]">Em construção.</p>
    </section>
  )
}

/** Moldura das telas logadas, alimentada pela sessão. Se o logout falhar, a pessoa continua logada e é avisada. */
function MolduraDoUsuario() {
  const { usuario, sair } = useAuth()
  const [erroAoSair, setErroAoSair] = useState<string | null>(null)

  function aoSair() {
    setErroAoSair(null)
    sair().catch(() => setErroAoSair('Não foi possível sair. Tente de novo.'))
  }

  return (
    <>
      <AppShell nomeUsuario={usuario?.nome} aoSair={aoSair} />
      {erroAoSair !== null && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
          <p
            role="alert"
            className="m-0 rounded-xl border border-[var(--cor-negativo)] bg-[#fdecec] px-4 py-2.5 text-sm text-[var(--cor-texto)] shadow-lg"
          >
            {erroAoSair}
          </p>
        </div>
      )}
    </>
  )
}

/**
 * Rotas do app (dentro de `AuthProvider`). Login e cadastro são públicos; o resto exige sessão
 * (`RotaProtegida`). O formulário de lançamento é rota filha da lista. O relatório entra na tarefa seguinte.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route element={<RotaProtegida />}>
        <Route element={<MolduraDoUsuario />}>
          <Route path="/" element={<InicioPage />} />
          <Route path="/lancamentos" element={<LancamentosPage />}>
            <Route path="novo" element={<LancamentoForm />} />
            <Route path=":id" element={<LancamentoForm />} />
          </Route>
          <Route path="/cartoes" element={<CartoesPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/relatorios" element={<EmBreve titulo="Relatórios" />} />
          <Route path="/conta/senha" element={<DefinirSenhaPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
