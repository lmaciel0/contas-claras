import { afterEach, describe, expect, it } from 'vitest'
import { travarRolagem } from './travaRolagem'

afterEach(() => {
  document.body.style.overflow = ''
})

describe('travarRolagem', () => {
  it('trava o body e restaura o valor original ao soltar', () => {
    document.body.style.overflow = 'scroll'
    const soltar = travarRolagem()
    expect(document.body.style.overflow).toBe('hidden')
    soltar()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('soltar fora de ordem só restaura quando a última trava cai', () => {
    const primeira = travarRolagem()
    const segunda = travarRolagem()
    primeira()
    expect(document.body.style.overflow).toBe('hidden')
    segunda()
    expect(document.body.style.overflow).toBe('')
  })

  it('soltar duas vezes a mesma trava não desfaz a trava dos outros', () => {
    const primeira = travarRolagem()
    const segunda = travarRolagem()
    primeira()
    primeira()
    expect(document.body.style.overflow).toBe('hidden')
    segunda()
    expect(document.body.style.overflow).toBe('')
  })
})
