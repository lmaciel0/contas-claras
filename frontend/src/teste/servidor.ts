import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ResumoResponse } from '../api/tipos'

const resumoVazio: ResumoResponse = {
  receitas: '0.00',
  despesas: '0.00',
  sobra: '0.00',
  sobraAno: '0.00',
  anterior: null,
  categorias: [],
  proximas: [],
  serieAno: [],
}

/**
 * Servidor MSW compartilhado pelos testes; cada teste registra seus handlers com `servidor.use(...)`.
 * Único handler de base: `GET /api/resumo` vazio, porque a tela inicial (`/`) o consulta sempre que um teste de
 * autenticação termina nela. Teste que olha o resumo registra o próprio handler, que tem prioridade.
 */
export const servidor = setupServer(http.get('/api/resumo', () => HttpResponse.json(resumoVazio)))
