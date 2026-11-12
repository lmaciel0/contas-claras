import { existsSync } from 'node:fs'
import { join } from 'node:path'
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

describe('fotoPadrao dos presets', () => {
  it('nenhuma_fotoPadrao_aponta_para_site_externo', () => {
    for (const preset of Object.values(PRESETS_VISUAIS)) {
      expect(preset.fotoPadrao).not.toMatch(/^https?:\/\//)
    }
  })

  it('toda_fotoPadrao_preenchida_existe_em_public', () => {
    for (const preset of Object.values(PRESETS_VISUAIS)) {
      if (preset.fotoPadrao === '') continue
      expect(preset.fotoPadrao).toBe(`/metas/${preset.id}.jpg`)
      expect(existsSync(join(process.cwd(), 'public', preset.fotoPadrao))).toBe(true)
    }
  })

  it('so_o_preset_personalizado_fica_sem_foto', () => {
    const semFoto = Object.values(PRESETS_VISUAIS).filter((p) => p.fotoPadrao === '').map((p) => p.id)
    expect(semFoto).toEqual(['personalizado'])
  })
})
