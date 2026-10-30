import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { CadastroPage } from './auth/CadastroPage'
import { DefinirSenhaPage } from './auth/DefinirSenhaPage'
import { LoginPage } from './auth/LoginPage'
import { RotaProtegida } from './auth/RotaProtegida'
import { useAuth } from './auth/useAuth'
import { AppShell } from './layout/AppShell'

function EmBreve({ titulo }: { titulo: string }): ReactNode {
  return (
    <section className="card">
      <h1 className="m-0 text-xl font-bold">{titulo}</h1>
      <p className="mt-2 mb-0 text-sm text-[var(--cor-mutado)]">Em construção.</p>
    </section>
  )
}

/** Moldura das telas logadas, alimentada pela sessão. */
function MolduraDoUsuario() {
  const { usuario, sair } = useAuth()
  return <AppShell nomeUsuario={usuario?.nome} aoSair={() => void sair()} />
}

/**
 * Rotas do app (dentro de `AuthProvider`). Login e cadastro são públicos; o resto exige sessão
 * (`RotaProtegida`). As telas de dados entram nas tarefas seguintes (Início na 12, Lançamentos na 13, ...).
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route element={<RotaProtegida />}>
        <Route element={<MolduraDoUsuario />}>
          <Route path="/" element={<EmBreve titulo="Início" />} />
          <Route path="/lancamentos" element={<EmBreve titulo="Lançamentos" />} />
          <Route path="/lancamentos/novo" element={<EmBreve titulo="Novo lançamento" />} />
          <Route path="/lancamentos/:id" element={<EmBreve titulo="Lançamento" />} />
          <Route path="/cartoes" element={<EmBreve titulo="Cartões" />} />
          <Route path="/categorias" element={<EmBreve titulo="Categorias" />} />
          <Route path="/relatorios" element={<EmBreve titulo="Relatórios" />} />
          <Route path="/conta/senha" element={<DefinirSenhaPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
