import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ResumoResponse, TarefasResponse } from '../api/tipos'

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

const tarefasVazias: TarefasResponse = {
  hoje: '2026-10-31',
  atrasadas: [],
  deHoje: [],
  proximas: [],
  concluidasHoje: [],
  concluidas: [],
  totalConcluidas: 0,
}

/**
 * Servidor MSW compartilhado pelos testes; cada teste registra seus handlers com `servidor.use(...)`.
 * Handlers de base: `GET /api/resumo` e `GET /api/tarefas` vazios, porque a tela inicial (`/`) os consulta sempre que
 * um teste de autenticação termina nela. Teste que olha o resumo registra o próprio handler, que tem prioridade.
 */
export const servidor = setupServer(
  http.get('/api/resumo', () => HttpResponse.json(resumoVazio)),
  http.get('/api/tarefas', () => HttpResponse.json(tarefasVazias)),
)
