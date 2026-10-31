import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AvisoServidor } from '../layout/AvisoServidor'
import { BotaoGoogle } from './BotaoGoogle'
import { MensagemDeErro } from './CampoTexto'
import { TelaCarregando } from './TelaAuth'
import { useAuth } from './useAuth'

/** Ordem das telas de auth: seguir para um índice maior desliza para a direita, voltar desliza para a esquerda. */
const ORDEM = ['/login', '/cadastro', '/confirmar', '/esqueci-senha']
/** O Google só entra por aqui: nas telas de código e de recuperação não faz sentido. */
const COM_GOOGLE = ['/login', '/cadastro']

type Direcao = 'direita' | 'esquerda' | null

/** Marca no topo das telas sem moldura (mesma pílula do app: bolinha índigo com "C" + nome). */
function Marca() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 font-bold text-[var(--cor-texto)] shadow-sm">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-[var(--cor-principal)] font-extrabold text-white"
      >
        C
      </span>
      <span>Contas Claras</span>
    </div>
  )
}

/**
 * Rota-layout das telas de auth (`/login`, `/cadastro`, `/confirmar`, `/esqueci-senha`). É a única dona de `carregando`
 * (a sessão sendo conferida), da marca, do card e do Google; as páginas filhas só cuidam do formulário e do `<Navigate>`
 * de quem já tem sessão. A troca de tela anima só a área do formulário (`key={pathname}`): o Google fica fora dela
 * para não ser reinicializado a cada troca.
 */
export function LayoutAuth() {
  const { carregando } = useAuth()
  const { pathname } = useLocation()

  // A direção é calculada uma vez por rota e fica guardada: se fosse derivada a cada render, qualquer atualização do
  // layout (ex.: erro do Google) tiraria a classe no meio do deslize. Guardar o caminho anterior no estado e ajustá-lo
  // durante o render é o padrão do React para derivar estado de uma mudança (sem efeito e sem escrever em ref).
  const [atual, setAtual] = useState<{ caminho: string; direcao: Direcao }>({ caminho: pathname, direcao: null })
  if (atual.caminho !== pathname) {
    const antes = ORDEM.indexOf(atual.caminho)
    const depois = ORDEM.indexOf(pathname)
    const conhecidas = antes !== -1 && depois !== -1
    setAtual({ caminho: pathname, direcao: !conhecidas ? null : depois > antes ? 'direita' : 'esquerda' })
  }

  const [erroGoogle, setErroGoogle] = useState<{ caminho: string; texto: string } | null>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (carregando) {
    return <TelaCarregando />
  }

  const comGoogle = Boolean(clientId) && COM_GOOGLE.includes(pathname)
  const classeDaAnimacao = atual.direcao === null ? '' : `auth-entra-${atual.direcao}`

  return (
    <div className="min-h-dvh bg-[var(--cor-fundo)]">
      <AvisoServidor />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-8">
        <Marca />
        <section className="auth-card w-full overflow-hidden">
          <div key={pathname} data-testid="area-animada" className={classeDaAnimacao}>
            <Outlet />
          </div>
          {comGoogle && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="m-0 text-xs font-medium text-[var(--cor-texto)]">ou continue com</p>
              <BotaoGoogle aoErro={(texto) => setErroGoogle({ caminho: pathname, texto })} />
              <MensagemDeErro texto={erroGoogle?.caminho === pathname ? erroGoogle.texto : null} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
