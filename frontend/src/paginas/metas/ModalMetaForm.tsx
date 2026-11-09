import { useState } from 'react'
import { Sparkles, Trash2, X } from 'lucide-react'
import type { MetaRequest, MetaResponse } from '../../api/tipos'
import { lerValor } from '../../formato/moeda'
import { FundoDoDialogo } from '../../layout/FundoDoDialogo'
import { useDialogoModal } from '../../layout/useDialogoModal'
import { getIconePreset } from './iconesMeta'
import { LISTA_PRESETS, obterPresetVisual } from './presetsVisuais'

interface Props {
  aberto: boolean
  meta: MetaResponse | null
  aoSalvar: (dados: MetaRequest) => Promise<void> | void
  aoExcluir?: (id: number) => Promise<void> | void
  aoFechar: () => void
}

export function ModalMetaForm({
  aberto,
  meta,
  aoSalvar,
  aoExcluir,
  aoFechar,
}: Props) {
  const { painel, prenderFoco } = useDialogoModal(aberto, aoFechar)
  const ehEdicao = Boolean(meta)

  const [titulo, setTitulo] = useState(meta?.titulo || '')
  const [valorAlvoTexto, setValorAlvoTexto] = useState(
    meta?.valorAlvo ? meta.valorAlvo.replace('.', ',') : '',
  )
  const [valorGuardadoTexto, setValorGuardadoTexto] = useState(
    meta?.valorGuardado ? meta.valorGuardado.replace('.', ',') : '',
  )
  const [prazo, setPrazo] = useState(meta?.prazo || '')
  const [presetVisual, setPresetVisual] = useState(
    meta?.presetVisual || 'personalizado',
  )
  const [fotoUrl, setFotoUrl] = useState(meta?.fotoUrl || '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  if (!aberto) {
    return null
  }

  const presetAtual = obterPresetVisual(presetVisual)

  const selecionarPreset = (id: string) => {
    setPresetVisual(id)
    const p = obterPresetVisual(id)
    if (!fotoUrl && p.fotoPadrao) {
      // foto sugerida
    }
  }

  const tratarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!titulo.trim()) {
      setErro('Informe o título da meta.')
      return
    }

    const alvoNormalizado = lerValor(valorAlvoTexto)
    if (!alvoNormalizado) {
      setErro('Informe um valor alvo válido maior que zero.')
      return
    }

    let guardadoNormalizado: string | undefined
    if (!ehEdicao && valorGuardadoTexto.trim()) {
      const g = lerValor(valorGuardadoTexto)
      if (g) {
        guardadoNormalizado = g
      }
    }

    const payload: MetaRequest = {
      titulo: titulo.trim(),
      valorAlvo: alvoNormalizado,
      valorGuardado: guardadoNormalizado,
      prazo: prazo ? prazo : null,
      presetVisual: presetAtual.id,
      icone: presetAtual.icone,
      corGradienteInicio: presetAtual.corGradienteInicio,
      corGradienteFim: presetAtual.corGradienteFim,
      fotoUrl: fotoUrl.trim() ? fotoUrl.trim() : null,
    }

    try {
      setSalvando(true)
      await aoSalvar(payload)
      aoFechar()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message)
      } else {
        setErro('Erro ao salvar a meta. Verifique os dados.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const tratarExcluir = async () => {
    if (!meta || !aoExcluir) return
    try {
      setSalvando(true)
      await aoExcluir(meta.id)
      aoFechar()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message)
      } else {
        setErro('Erro ao excluir meta.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <FundoDoDialogo testId="fundo-modal-meta-form" aoClicar={aoFechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-meta-form"
        onKeyDown={prenderFoco}
        className="superficie relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-2xl sm:rounded-3xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[var(--cor-linha)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--cor-principal)]/10 text-[var(--cor-principal)]">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <h2
                id="titulo-modal-meta-form"
                className="m-0 text-base font-bold text-[var(--cor-texto)]"
              >
                {ehEdicao ? 'Editar Meta' : 'Nova Meta ou Caixinha'}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-[var(--cor-mutado)]">
                {ehEdicao
                  ? 'Ajuste valores, prazos ou o visual da sua meta'
                  : 'Defina seu objetivo com valor alvo e prazo estimado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar diálogo"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/50 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Formulário com rolagem interna */}
        <form
          onSubmit={tratarEnvio}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
        >
          {/* Seletor de Presets Visuais */}
          <div>
            <label className="block text-xs font-semibold text-[var(--cor-texto)]">
              Estilo e Categoria Visual
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LISTA_PRESETS.map((p) => {
                const selecionado = presetVisual === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selecionarPreset(p.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      selecionado
                        ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)]/10 font-bold text-[var(--cor-principal)] shadow-xs'
                        : 'border-[var(--cor-linha)] bg-[var(--cor-fundo)] font-medium text-[var(--cor-texto)] hover:border-[var(--cor-linha)]/80'
                    }`}
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{
                        background: `linear-gradient(135deg, ${p.corGradienteInicio}, ${p.corGradienteFim})`,
                      }}
                    >
                      {getIconePreset(p.icone)}
                    </span>
                    <span className="truncate text-xs">{p.nome}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Título da Meta */}
          <div>
            <label
              htmlFor="campo-titulo-meta"
              className="block text-xs font-semibold text-[var(--cor-texto)]"
            >
              Título da Meta
            </label>
            <input
              id="campo-titulo-meta"
              type="text"
              required
              placeholder="Ex: IPVA 2027, Viagem para praia..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 py-2.5 text-sm font-medium text-[var(--cor-texto)] placeholder:font-normal placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
            />
          </div>

          {/* Valor Alvo e Valor Inicial (se criação) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="campo-alvo-meta"
                className="block text-xs font-semibold text-[var(--cor-texto)]"
              >
                Valor Alvo (R$)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-[var(--cor-mutado)]">
                  R$
                </span>
                <input
                  id="campo-alvo-meta"
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={valorAlvoTexto}
                  onChange={(e) => setValorAlvoTexto(e.target.value)}
                  className="w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] py-2 pr-3 pl-9 text-sm font-bold text-[var(--cor-texto)] placeholder:font-normal placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
                />
              </div>
            </div>

            {!ehEdicao && (
              <div>
                <label
                  htmlFor="campo-guardado-meta"
                  className="block text-xs font-semibold text-[var(--cor-texto)]"
                >
                  Já guardado (opcional)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-[var(--cor-mutado)]">
                    R$
                  </span>
                  <input
                    id="campo-guardado-meta"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorGuardadoTexto}
                    onChange={(e) => setValorGuardadoTexto(e.target.value)}
                    className="w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] py-2 pr-3 pl-9 text-sm font-bold text-[var(--cor-texto)] placeholder:font-normal placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prazo */}
          <div>
            <label
              htmlFor="campo-prazo-meta"
              className="block text-xs font-semibold text-[var(--cor-texto)]"
            >
              Prazo Estimado (opcional)
            </label>
            <input
              id="campo-prazo-meta"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3 py-2 text-sm text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
            />
            <span className="mt-1 block text-[11px] text-[var(--cor-mutado)]">
              Com o prazo definido, calculamos o ritmo mensal necessário para
              você chegar lá.
            </span>
          </div>

          {/* Foto Personalizada (URL) */}
          <div>
            <label
              htmlFor="campo-foto-meta"
              className="block text-xs font-semibold text-[var(--cor-texto)]"
            >
              Foto ou Imagem de Fundo (URL opcional)
            </label>
            <input
              id="campo-foto-meta"
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3 py-2 text-xs text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
            />
          </div>

          {erro && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {erro}
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="mt-2 flex items-center justify-between border-t border-[var(--cor-linha)] pt-4">
            {ehEdicao && aoExcluir ? (
              confirmandoExclusao ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={tratarExcluir}
                    disabled={salvando}
                    className="cursor-pointer rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Confirmar exclusão
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(false)}
                    className="cursor-pointer rounded-xl border border-[var(--cor-linha)] px-2.5 py-1.5 text-xs font-medium text-[var(--cor-mutado)]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                  <span>Excluir meta</span>
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={aoFechar}
                disabled={salvando}
                className="cursor-pointer rounded-xl border border-[var(--cor-linha)] px-4 py-2 text-xs font-semibold text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/30 hover:text-[var(--cor-texto)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="cursor-pointer rounded-xl bg-[var(--cor-principal)] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar meta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
