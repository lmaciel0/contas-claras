import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { servidor } from './servidor'

/**
 * O jsdom não tem layout nem `ResizeObserver`, e o `ResponsiveContainer` do Recharts só desenha depois de medir o
 * contêiner. Este mock "mede" 800 × 300 assim que o elemento é observado, para o gráfico renderizar nos testes.
 */
class ResizeObserverFalso implements ResizeObserver {
  private readonly aoMedir: ResizeObserverCallback

  constructor(aoMedir: ResizeObserverCallback) {
    this.aoMedir = aoMedir
  }

  observe(alvo: Element) {
    const contentRect = { width: 800, height: 300, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 300 }
    this.aoMedir([{ target: alvo, contentRect } as ResizeObserverEntry], this)
  }

  unobserve() {}

  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverFalso

/**
 * O ProseMirror (editor de notas) mede posições com APIs de layout que o jsdom não implementa. Só preenche o que
 * falta, com retornos vazios, sem mudar o comportamento dos outros testes.
 */
const retanguloVazio = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) })
if (typeof document.elementFromPoint !== 'function') document.elementFromPoint = () => null
if (typeof Range.prototype.getBoundingClientRect !== 'function') Range.prototype.getBoundingClientRect = retanguloVazio
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  servidor.resetHandlers()
})

afterAll(() => servidor.close())
