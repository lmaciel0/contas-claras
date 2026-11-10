import { describe, expect, it } from 'vitest'
import {
  LISTA_PRESETS,
  PRESETS_VISUAIS,
  obterPresetVisual,
} from './presetsVisuais'

describe('Presets Visuais de Metas', () => {
  it('contém os 6 presets esperados', () => {
    expect(LISTA_PRESETS).toHaveLength(6)
    const ids = LISTA_PRESETS.map((p) => p.id)
    expect(ids).toContain('reserva')
    expect(ids).toContain('viagem')
    expect(ids).toContain('carro')
    expect(ids).toContain('casa')
    expect(ids).toContain('estudos')
    expect(ids).toContain('personalizado')
  })

  it('retorna o preset correto quando o id existe', () => {
    const preset = obterPresetVisual('viagem')
    expect(preset.id).toBe('viagem')
    expect(preset.nome).toBe('Viagem & Férias')
    expect(preset.corGradienteInicio).toBe(PRESETS_VISUAIS.viagem.corGradienteInicio)
    expect(preset.corGradienteFim).toBe(PRESETS_VISUAIS.viagem.corGradienteFim)
    expect(preset.icone).toBe('plane')
  })

  it('retorna o preset personalizado como fallback para ids desconhecidos ou vazios', () => {
    expect(obterPresetVisual('inexistente').id).toBe('personalizado')
    expect(obterPresetVisual(null).id).toBe('personalizado')
    expect(obterPresetVisual(undefined).id).toBe('personalizado')
    expect(obterPresetVisual('').id).toBe('personalizado')
  })
})
