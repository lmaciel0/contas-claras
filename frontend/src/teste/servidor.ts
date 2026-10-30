import { setupServer } from 'msw/node'

/** Servidor MSW compartilhado pelos testes; cada teste registra seus handlers com `servidor.use(...)`. */
export const servidor = setupServer()
