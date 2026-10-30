/**
 * Rota para onde ir depois de entrar. Só aceita caminho interno (`/algo`): `//outro.site` ou URL completa
 * viram `/`, para o parâmetro `voltar` não servir de redirecionamento aberto.
 */
export function destinoAposEntrar(voltar: string | null): string {
  if (voltar !== null && voltar.startsWith('/') && !voltar.startsWith('//') && !voltar.includes('\\')) {
    return voltar
  }
  return '/'
}
