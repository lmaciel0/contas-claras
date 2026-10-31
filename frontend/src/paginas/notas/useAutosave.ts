import { useCallback, useEffect, useRef, useState } from 'react'

export type EstadoAutosave = 'salvo' | 'pendente' | 'salvando' | 'erro'

interface Opcoes<T> {
  valor: T
  salvar: (valor: T) => Promise<unknown>
  /** Gravação final (desmontagem/descarga); se faltar, vale `salvar`. Ali é melhor gravar algo do que perder a edição. */
  salvarAoSair?: (valor: T) => Promise<unknown>
  atrasoMs?: number
  aoSair?: (valor: T) => void
}

/**
 * Salva `valor` um tempo depois da última mudança. O primeiro valor é o estado já salvo. Só há uma gravação por vez:
 * se o valor muda durante uma gravação, sai exatamente uma gravação depois, com o valor mais recente.
 */
export function useAutosave<T>({ valor, salvar, salvarAoSair, atrasoMs = 1000, aoSair }: Opcoes<T>) {
  const [estado, setEstado] = useState<EstadoAutosave>('salvo')
  const valorRef = useRef(valor)
  const ultimoSalvoRef = useRef(valor)
  const salvarRef = useRef(salvar)
  const salvarAoSairRef = useRef(salvarAoSair)
  const aoSairRef = useRef(aoSair)
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emAndamento = useRef<Promise<void> | null>(null)
  const pendente = useRef(false)

  useEffect(() => {
    salvarRef.current = salvar
    salvarAoSairRef.current = salvarAoSair
    aoSairRef.current = aoSair
  })

  const limparRelogio = () => {
    if (relogio.current !== null) clearTimeout(relogio.current)
    relogio.current = null
  }

  const gravar = useCallback(async (saindo = false): Promise<void> => {
    limparRelogio()
    if (emAndamento.current) return emAndamento.current
    if (!pendente.current) return
    const enviado = valorRef.current
    pendente.current = false
    setEstado('salvando')
    const tarefa = (async () => {
      try {
        await (saindo ? (salvarAoSairRef.current ?? salvarRef.current) : salvarRef.current)(enviado)
        ultimoSalvoRef.current = enviado
        setEstado(pendente.current ? 'pendente' : 'salvo')
      } catch {
        pendente.current = true
        setEstado('erro')
      } finally {
        emAndamento.current = null
      }
    })()
    emAndamento.current = tarefa
    return tarefa
  }, [])

  const agendar = useCallback(() => {
    limparRelogio()
    relogio.current = setTimeout(() => {
      relogio.current = null
      void gravar()
    }, atrasoMs)
  }, [gravar, atrasoMs])

  useEffect(() => {
    if (Object.is(valor, valorRef.current)) return
    valorRef.current = valor
    pendente.current = true
    setEstado(emAndamento.current ? 'salvando' : 'pendente')
    agendar()
  }, [valor, agendar])

  // Se o relógio disparou durante uma gravação, `gravar` não fez nada; ao concluir, rearma para a gravação seguinte.
  useEffect(() => {
    if (estado === 'pendente' && !relogio.current) agendar()
  }, [estado, agendar])

  const descarregar = useCallback(() => gravar(true), [gravar])

  /** Descarta o que espera para ser gravado, sem enviar (ex.: a nota vai ser excluída). */
  const cancelar = useCallback(() => {
    limparRelogio()
    pendente.current = false
  }, [])

  useEffect(() => {
    const sair = () => {
      if (pendente.current) aoSairRef.current?.(valorRef.current)
    }
    const aoOcultar = () => {
      if (document.visibilityState === 'hidden') sair()
    }
    window.addEventListener('pagehide', sair)
    document.addEventListener('visibilitychange', aoOcultar)
    return () => {
      window.removeEventListener('pagehide', sair)
      document.removeEventListener('visibilitychange', aoOcultar)
      limparRelogio()
      const andamento = emAndamento.current
      if (andamento) void andamento.then(() => (pendente.current ? gravar(true) : undefined))
      else if (pendente.current) void gravar(true)
    }
  }, [gravar])

  return { estado, descarregar, cancelar }
}
