import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from './layout/AppShell'

function EmBreve({ titulo }: { titulo: string }): ReactNode {
  return (
    <section className="card">
      <h1 className="m-0 text-xl font-bold">{titulo}</h1>
      <p className="mt-2 mb-0 text-sm text-[var(--cor-mutado)]">Em construção.</p>
    </section>
  )
}

/**
 * Rotas do app. As telas entram nas tarefas seguintes (login/cadastro na 11, Início na 12,
 * Lançamentos na 13, ...); aqui só o esqueleto com a moldura responsiva.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<EmBreve titulo="Entrar" />} />
      <Route path="/cadastro" element={<EmBreve titulo="Criar conta" />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<EmBreve titulo="Início" />} />
        <Route path="/lancamentos" element={<EmBreve titulo="Lançamentos" />} />
        <Route path="/lancamentos/novo" element={<EmBreve titulo="Novo lançamento" />} />
        <Route path="/lancamentos/:id" element={<EmBreve titulo="Lançamento" />} />
        <Route path="/cartoes" element={<EmBreve titulo="Cartões" />} />
        <Route path="/categorias" element={<EmBreve titulo="Categorias" />} />
        <Route path="/relatorios" element={<EmBreve titulo="Relatórios" />} />
        <Route path="/conta/senha" element={<EmBreve titulo="Alterar senha" />} />
      </Route>
    </Routes>
  )
}
