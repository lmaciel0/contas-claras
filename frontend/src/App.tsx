import { lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { LayoutAuth } from './auth/LayoutAuth'
import { RotaProtegida } from './auth/RotaProtegida'
import { useAuth } from './auth/useAuth'
import { Carregando } from './componentes/Carregando'
import { ErroDeCarregamento } from './componentes/ErroDeCarregamento'
import { AppShell } from './layout/AppShell'
import { useEhCelular } from './layout/useEhCelular'
import { NaoEncontradaPage } from './paginas/NaoEncontradaPage'
import { PreferenciasProvider } from './preferencias/PreferenciasContext'
// As páginas saem do bundle principal: cada rota baixa o seu chunk só quando é aberta (o Tiptap, por exemplo, só vem
// com as notas). As páginas exportam componentes nomeados, então o import adapta para o `default` que o `lazy` pede.
const CadastroPage = lazy(() => import('./auth/CadastroPage').then((m) => ({ default: m.CadastroPage })))
const ConfirmarPage = lazy(() => import('./auth/ConfirmarPage').then((m) => ({ default: m.ConfirmarPage })))
const DefinirSenhaPage = lazy(() => import('./auth/DefinirSenhaPage').then((m) => ({ default: m.DefinirSenhaPage })))
const EsqueciSenhaPage = lazy(() => import('./auth/EsqueciSenhaPage').then((m) => ({ default: m.EsqueciSenhaPage })))
const ExcluirContaPage = lazy(() => import('./auth/ExcluirContaPage').then((m) => ({ default: m.ExcluirContaPage })))
const LoginPage = lazy(() => import('./auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const ExclusaoDeContaPage = lazy(() =>
  import('./legal/ExclusaoDeContaPage').then((m) => ({ default: m.ExclusaoDeContaPage })),
)
const PrivacidadePage = lazy(() => import('./legal/PrivacidadePage').then((m) => ({ default: m.PrivacidadePage })))
const TermosPage = lazy(() => import('./legal/TermosPage').then((m) => ({ default: m.TermosPage })))
const CartoesPage = lazy(() => import('./paginas/cartoes/CartoesPage').then((m) => ({ default: m.CartoesPage })))
const CategoriasPage = lazy(() =>
  import('./paginas/categorias/CategoriasPage').then((m) => ({ default: m.CategoriasPage })),
)
const InicioPage = lazy(() => import('./paginas/inicio/InicioPage').then((m) => ({ default: m.InicioPage })))
const LancamentoForm = lazy(() =>
  import('./paginas/lancamentos/LancamentoForm').then((m) => ({ default: m.LancamentoForm })),
)
const LancamentosPage = lazy(() =>
  import('./paginas/lancamentos/LancamentosPage').then((m) => ({ default: m.LancamentosPage })),
)
const PainelPage = lazy(() => import('./paginas/painel/PainelPage').then((m) => ({ default: m.PainelPage })))
const RelatoriosPage = lazy(() =>
  import('./paginas/relatorios/RelatoriosPage').then((m) => ({ default: m.RelatoriosPage })),
)
const MaisPage = lazy(() => import('./paginas/mais/MaisPage').then((m) => ({ default: m.MaisPage })))
const NotaPage = lazy(() => import('./paginas/notas/NotaPage').then((m) => ({ default: m.NotaPage })))
const NotasPage = lazy(() => import('./paginas/notas/NotasPage').then((m) => ({ default: m.NotasPage })))
const ProjetosPage = lazy(() => import('./paginas/projetos/ProjetosPage').then((m) => ({ default: m.ProjetosPage })))
const TarefasPage = lazy(() => import('./paginas/tarefas/TarefasPage').then((m) => ({ default: m.TarefasPage })))

/**
 * Fronteira de carregamento de uma página lazy. Fica em cada rota (e não uma só no topo) para a moldura continuar
 * na tela, e as páginas-pai de rotas aninhadas, enquanto o chunk da filha baixa. O fallback é o `Carregando`
 * (`role="status"`, texto para leitor de tela, `prefers-reduced-motion` respeitado). Se o chunk falhar (ex.: deploy novo
 * removeu o arquivo), o `ErroDeCarregamento` mostra o alerta com "Recarregar" só nessa área, sem derrubar o app.
 */
function Pagina({ children }: { children: ReactNode }) {
  return (
    <ErroDeCarregamento>
      <Suspense fallback={<Carregando />}>{children}</Suspense>
    </ErroDeCarregamento>
  )
}

/**
 * Moldura das telas logadas, alimentada pela sessão. Ao sair mostra "Saindo…" na hora (a API pode estar acordando) e
 * ignora novo clique enquanto a chamada dura. Se o logout falhar, a pessoa continua logada e é avisada.
 */
function MolduraDoUsuario() {
  const { usuario, sair } = useAuth()
  const ehCelular = useEhCelular()
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
        // Sem `pointer-events-none` o wrapper (largura total) cobriria a dock e o erro persistente bloquearia os toques.
        // No celular sobe acima da dock inferior e do botão "Criar" (que ocupa de 5 a 8 rem).
        <div
          className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${
            ehCelular ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom))]' : 'bottom-6'
          }`}
        >
          {saindo ? (
            <p
              role="status"
              className="pointer-events-auto m-0 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-4 py-2.5 text-sm text-[var(--cor-texto)] shadow-lg"
            >
              Saindo…
            </p>
          ) : (
            <p
              role="alert"
              className="pointer-events-auto m-0 rounded-xl border border-[var(--cor-negativo)] bg-[var(--cor-erro-fundo)] px-4 py-2.5 text-sm text-[var(--cor-texto)] shadow-lg"
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
 * Rotas do app (dentro de `AuthProvider`). Login, cadastro, `/privacidade`, `/termos` e `/excluir-conta` são públicos (as páginas legais ficam fora do `LayoutAuth` e abrem igual com ou sem sessão); o resto exige sessão
 * (`RotaProtegida`). O formulário de lançamento é rota filha da lista.
 */
export function App() {
  return (
    <PreferenciasProvider>
      <Routes>
      <Route path="/privacidade" element={<Pagina><PrivacidadePage /></Pagina>} />
      <Route path="/termos" element={<Pagina><TermosPage /></Pagina>} />
      <Route path="/excluir-conta" element={<Pagina><ExclusaoDeContaPage /></Pagina>} />
      <Route element={<LayoutAuth />}>
        <Route path="/login" element={<Pagina><LoginPage /></Pagina>} />
        <Route path="/cadastro" element={<Pagina><CadastroPage /></Pagina>} />
        <Route path="/confirmar" element={<Pagina><ConfirmarPage /></Pagina>} />
        <Route path="/esqueci-senha" element={<Pagina><EsqueciSenhaPage /></Pagina>} />
      </Route>
      <Route element={<RotaProtegida />}>
        <Route element={<MolduraDoUsuario />}>
          <Route path="/" element={<Pagina><PainelPage /></Pagina>} />
          <Route path="/projetos" element={<Pagina><ProjetosPage /></Pagina>} />
          <Route path="/tarefas" element={<Pagina><TarefasPage /></Pagina>} />
          <Route path="/notas" element={<Pagina><NotasPage /></Pagina>}>
            <Route path=":id" element={<Pagina><NotaPage /></Pagina>} />
          </Route>
          <Route path="/financeiro" element={<Pagina><InicioPage /></Pagina>} />
          <Route path="/lancamentos" element={<Pagina><LancamentosPage /></Pagina>}>
            <Route path="novo" element={<Pagina><LancamentoForm /></Pagina>} />
            <Route path=":id" element={<Pagina><LancamentoForm /></Pagina>} />
          </Route>
          <Route path="/cartoes" element={<Pagina><CartoesPage /></Pagina>} />
          <Route path="/categorias" element={<Pagina><CategoriasPage /></Pagina>} />
          <Route path="/relatorios" element={<Pagina><RelatoriosPage /></Pagina>} />
          <Route path="/mais" element={<Pagina><MaisPage /></Pagina>} />
          <Route path="/conta/senha" element={<Pagina><DefinirSenhaPage /></Pagina>} />
          <Route path="/conta/excluir" element={<Pagina><ExcluirContaPage /></Pagina>} />
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>
      </Routes>
    </PreferenciasProvider>
  )
}
