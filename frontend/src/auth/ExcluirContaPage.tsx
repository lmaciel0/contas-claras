import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router'
import { ErroApi } from '../api/cliente'
import { CONTATO_EMAIL } from '../legal/responsavel'
import { BotaoGoogle } from './BotaoGoogle'
import { CampoTexto, classeBotaoSecundario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { ehSessaoPerdida } from './sessaoPerdida'
import { useAuth } from './useAuth'
import { useExcluirConta } from './useExcluirConta'

const MENSAGEM_SENHA_INCORRETA = 'Senha incorreta.'
const MENSAGEM_GOOGLE_INCORRETO = 'Não foi possível confirmar: use a mesma conta Google do seu cadastro.'
const MENSAGEM_SENHA_VAZIA = 'Informe a sua senha.'
const MENSAGEM_SEM_CIENCIA = 'Marque "Entendo que é definitivo" antes de confirmar.'

const classeBotaoPerigo =
  'min-h-11 cursor-pointer rounded-full bg-[var(--cor-negativo)] px-5 text-base font-semibold text-[var(--cor-sobre-negativo)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)]'

/**
 * `/conta/excluir` (dentro da `RotaProtegida`). Apaga a conta e tudo o que ela tem, na hora e sem volta, depois de uma
 * ciência explícita e de uma reautenticação: a senha, ou o Google quando a conta não tem senha (`usuario.temSenha`).
 * Senha ou conta Google errada devolve 401, mas a pessoa continua logada e só vê o aviso (ver `useExcluirConta`).
 */
export function ExcluirContaPage() {
  const { usuario } = useAuth()
  const temSenha = usuario?.temSenha === true
  // Sem `VITE_GOOGLE_CLIENT_ID` o `BotaoGoogle` não renderiza: a conta só-Google não teria como se reautenticar aqui.
  const googleDisponivel = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  const excluir = useExcluirConta()
  const [senha, setSenha] = useState('')
  const [ciente, setCiente] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const excluindo = excluir.isPending

  const erroDaApi =
    excluir.error === null || ehSessaoPerdida(excluir.error)
      ? null
      : excluir.error instanceof ErroApi && excluir.error.status === 401
        ? temSenha
          ? MENSAGEM_SENHA_INCORRETA
          : MENSAGEM_GOOGLE_INCORRETO
        : mensagemDoErro(excluir.error)
  const erro = erroLocal ?? erroDaApi

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (excluindo) {
      return
    }
    if (!ciente) {
      setErroLocal(MENSAGEM_SEM_CIENCIA)
      return
    }
    if (senha === '') {
      setErroLocal(MENSAGEM_SENHA_VAZIA)
      return
    }
    setErroLocal(null)
    excluir.mutate({ senha })
  }

  function aoReceberCredencialGoogle(credencialGoogle: string) {
    if (excluindo) {
      return
    }
    if (!ciente) {
      setErroLocal(MENSAGEM_SEM_CIENCIA)
      return
    }
    setErroLocal(null)
    excluir.mutate({ credencialGoogle })
  }

  return (
    <section className="card mx-auto w-full max-w-md p-6">
      <h1 className="m-0 mb-1 text-xl font-bold">Excluir conta</h1>
      <p className="m-0 mb-3 text-sm">
        A exclusão é imediata e definitiva: apagamos a sua conta e tudo o que ela guarda (tarefas, notas, lançamentos,
        cartões, categorias e projetos). Não há como desfazer nem recuperar depois.
      </p>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={ciente}
            disabled={excluindo}
            onChange={(evento) => {
              setCiente(evento.target.checked)
              setErroLocal(null)
              excluir.reset()
            }}
            className="size-5 shrink-0 cursor-pointer accent-[var(--cor-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          />
          Entendo que é definitivo
        </label>

        {temSenha ? (
          <CampoTexto
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            disabled={excluindo}
            onChange={(evento) => {
              setSenha(evento.target.value)
              setErroLocal(null)
              excluir.reset()
            }}
          />
        ) : googleDisponivel ? (
          <div className="flex flex-col items-center gap-2">
            <p className="m-0 text-center text-sm">
              Esta conta entra com o Google. Para confirmar que é você, use o botão abaixo.
            </p>
            {/* `inert` bloqueia clique e foco no botão do Google até a ciência ser marcada (ou enquanto exclui). */}
            <div
              inert={!ciente || excluindo}
              className={`transition-opacity duration-150 motion-reduce:transition-none ${ciente && !excluindo ? '' : 'opacity-50'}`}
            >
              <BotaoGoogle aoErro={setErroLocal} aoCredential={aoReceberCredencialGoogle} />
            </div>
            {!ciente && (
              <p className="m-0 text-center text-xs text-[var(--cor-mutado)]">
                Marque a caixa acima para liberar o botão do Google.
              </p>
            )}
          </div>
        ) : (
          <p className="m-0 text-center text-sm">
            Esta conta entra com o Google, e o login com o Google não está disponível neste ambiente. Para pedir a
            exclusão, escreva para <a href={`mailto:${CONTATO_EMAIL}`} className="underline">{CONTATO_EMAIL}</a>.
          </p>
        )}

        <MensagemDeErro texto={erro} />
        {excluindo && (
          <p role="status" className="m-0 text-sm">
            Excluindo…
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link to="/" className={`${classeBotaoSecundario} inline-flex items-center no-underline`}>
            Cancelar
          </Link>
          {temSenha && (
            <button type="submit" disabled={!ciente || excluindo} className={classeBotaoPerigo}>
              {excluindo ? 'Excluindo…' : 'Excluir minha conta'}
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
