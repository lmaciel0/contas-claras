import { useRef, useState } from 'react'
import { Route, Routes } from 'react-router'
import { CadastroPage } from './auth/CadastroPage'
import { ConfirmarPage } from './auth/ConfirmarPage'
import { DefinirSenhaPage } from './auth/DefinirSenhaPage'
import { LayoutAuth } from './auth/LayoutAuth'
import { LoginPage } from './auth/LoginPage'
import { RotaProtegida } from './auth/RotaProtegida'
import { useAuth } from './auth/useAuth'
import { AppShell } from './layout/AppShell'
import { CartoesPage } from './paginas/cartoes/CartoesPage'
import { CategoriasPage } from './paginas/categorias/CategoriasPage'
import { InicioPage } from './paginas/inicio/InicioPage'
import { LancamentoForm } from './paginas/lancamentos/LancamentoForm'
import { LancamentosPage } from './paginas/lancamentos/LancamentosPage'
import { NaoEncontradaPage } from './paginas/NaoEncontradaPage'
import { RelatoriosPage } from './paginas/relatorios/RelatoriosPage'

/**
 * Moldura das telas logadas, alimentada pela sessão. Ao sair mostra "Saindo…" na hora (a API pode estar acordando) e
 * ignora novo clique enquanto a chamada dura. Se o logout falhar, a pessoa continua logada e é avisada.
 */
function MolduraDoUsuario() {
  const { usuario, sair } = useAuth()
  const [saindo, setSaindo] = useState(false)
  const [erroAoSair, setErroAoSair] = useState<string | null>(null)
  // O ref vale já no clique; o estado só chega no próximo render, tarde para barrar um segundo clique rápido.
  const saindoAgora = useRef(false)

  function aoSair() {
    if (saindoAgora.current) {
      return
    }
    saindoAgora.current = true
    setSaindo(true)
    setErroAoSair(null)
    sair().catch(() => {
      saindoAgora.current = false
      setSaindo(false)
      setErroAoSair('Não foi possível sair. Tente de novo.')
    })
  }

  return (
    <>
      <AppShell nomeUsuario={usuario?.nome} aoSair={aoSair} />
      {(saindo || erroAoSair !== null) && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 xl:bottom-6">
          {saindo ? (
            <p
              role="status"
              className="m-0 rounded-xl border border-[var(--cor-linha)] bg-white px-4 py-2.5 text-sm text-[var(--cor-texto)] shadow-lg"
            >
              Saindo…
            </p>
          ) : (
            <p
              role="alert"
              className="m-0 rounded-xl border border-[var(--cor-negativo)] bg-[#fdecec] px-4 py-2.5 text-sm text-[var(--cor-texto)] shadow-lg"
            >
              {erroAoSair}
            </p>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Rotas do app (dentro de `AuthProvider`). Login e cadastro são públicos; o resto exige sessão
 * (`RotaProtegida`). O formulário de lançamento é rota filha da lista.
 */
export function App() {
  return (
    <Routes>
      <Route element={<LayoutAuth />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/confirmar" element={<ConfirmarPage />} />
      </Route>
      <Route element={<RotaProtegida />}>
        <Route element={<MolduraDoUsuario />}>
          <Route path="/" element={<InicioPage />} />
          <Route path="/lancamentos" element={<LancamentosPage />}>
            <Route path="novo" element={<LancamentoForm />} />
            <Route path=":id" element={<LancamentoForm />} />
          </Route>
          <Route path="/cartoes" element={<CartoesPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/conta/senha" element={<DefinirSenhaPage />} />
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
