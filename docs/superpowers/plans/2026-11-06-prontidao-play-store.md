# Prontidão para a Play Store: plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development. Passos com checkbox (`- [ ]`).

**Objetivo:** fechar as lacunas que um usuário novo da Play Store sentiria: app sem internet, tela branca quando o React quebra, erros invisíveis para o dono, falta de exportação dos dados e dívidas pequenas já anotadas.

**Arquitetura:** quatro PRs independentes (o PR 2 parte do PR 1). Nada de dependência nova: service worker escrito à mão, relato de erros na própria API (sem Sentry, para não acrescentar um operador de dados), exportação em JSON pela API.

**Stack:** React 19 + Vite + vitest/msw (front); Java 21 + Spring Boot 4 + Testcontainers (back).

**Origem:** decidido na conversa de 2026-11-06. O Lucas aprovou o escopo ("pode fazer tudo") e deixou as escolhas comigo. As decisões marcadas *(escolha do Claude)* são minhas.

## Restrições globais

- PT-BR em código de domínio, textos, commits e PRs. Commits convencionais (`feat(...)`, `fix(...)`).
- Front: só tokens `--cor-*`, `min-h-11`, foco visível, `prefers-reduced-motion`, nunca `dangerouslySetInnerHTML`.
- Código `.java` só pelo agent `java-spring`; front só pelo `frontend-developer`. TDD: teste falhando primeiro.
- Isolamento por usuário: todo dado é filtrado pelo usuário logado.
- Comandos: `cd backend && ./mvnw -q test`; `cd frontend && npx vitest run --reporter=dot && npm run build && npm run lint`.
- Quem faz o merge é o Lucas. Push e PR estão autorizados.

## Foco de revisão

1. Service worker preso numa versão antiga: o SW nunca pode servir `index.html` nem JS do cache. Só a página offline fica em cache.
2. Relato de erro com dado pessoal: a rota é enviada sem query string, a mensagem é cortada, e não vão corpo de requisição, e-mail nem id de usuário.
3. Relato de erro usado como spam ou para injetar linhas no log: limite por IP, tamanho máximo, e CR/LF trocados por espaço antes de logar.
4. Exportação vazando dado de outro usuário ou o hash da senha: teste com dois usuários e teste de que não aparecem `senha`, `hash` nem `token`.
5. Um laço de erros (o erro do relato gera outro relato): falha no envio é engolida, e o limite é de 5 relatos por carga de página.

---

## PR 1: `feat/offline-e-tela-de-erro` (só front)

### Tarefa 1.1: página offline e service worker

**Arquivos:** criar `frontend/public/sw.js`, `frontend/public/offline.html`, `frontend/src/registrarServiceWorker.ts` e `.test.ts`; alterar `frontend/src/main.tsx`.

- `registrarServiceWorker(ambiente = { prod: import.meta.env.PROD, nav: navigator }): void`: só registra `/sw.js` (scope `/`) se `prod` for verdadeiro e houver `'serviceWorker' in nav`. Registra no `load` da janela. Erro no registro é engolido.
- `sw.js`: cache `aprumo-offline-v1` com `/offline.html` e `/icon-192.png` no `install` (`skipWaiting`). No `activate`, apaga os outros caches e chama `clients.claim()`. No `fetch`, só para `request.mode === 'navigate'`: rede primeiro; se falhar, devolve `/offline.html` do cache. Qualquer outra requisição segue sem `respondWith`. Não faz cache de `/api`.
- `offline.html`: HTML independente com estilo inline e claro/escuro por `prefers-color-scheme` (sem JS, porque a CSP bloqueia script inline). Mostra o ícone, "Sem conexão", "O Aprumo precisa de internet para mostrar seus dados." e um link-botão "Tentar de novo" para `/`, com alvo de toque de pelo menos 44 px.
- [ ] Testes que falham: registra com `prod: true` e SW disponível; não registra com `prod: false`; não registra sem `serviceWorker`.
- [ ] Implementar e passar. Em `main.tsx`, chamar `registrarServiceWorker()` depois de `instalarRecarregarNoErroDeChunk()`.
- [ ] Conferir: `npm run build` copia `sw.js` e `offline.html` para `dist/`.
- [ ] Commit `feat(pwa): página offline com service worker`.

### Tarefa 1.2: tela de erro no lugar da tela branca

**Arquivos:** criar `frontend/src/componentes/LimiteDeErro.tsx` e `.test.tsx`; alterar `frontend/src/main.tsx` (envolve a árvore por fora dos providers).

- `class LimiteDeErro extends Component<{ children: ReactNode; aoErro?: (erro: Error, pilha?: string) => void }>`. Com erro, mostra o título "Algo deu errado", o texto "Recarregue a página para continuar. Seus dados estão salvos." e um botão "Recarregar" que chama `window.location.reload()`. Usa o visual de `ErroDeCarregamento` como referência. No `componentDidCatch`, chama `aoErro`.
- [ ] Testes que falham: um filho que lança erro mostra "Algo deu errado"; o botão chama `reload`; `aoErro` recebe o erro; sem erro, mostra os filhos.
- [ ] Implementar, passar e fazer commit `feat(front): tela de erro em vez de tela branca`.

## PR 2: `feat/relato-de-erros` (back e front; parte do PR 1)

### Tarefa 2.1 (java-spring): `POST /api/diagnostico/erros`

**Arquivos:** novo pacote `backend/src/main/java/dev/lmaciel/aprumo/diagnostico/`: `DiagnosticoController`, `dto/RelatoErroRequest`, `LimiteRelatos`; tornar a rota pública em `SecurityConfig` (lista `publicas`); teste de integração estendendo `IntegracaoTest`.

- `record RelatoErroRequest(@NotBlank @Size(max = 500) String mensagem, @Size(max = 4000) String pilha, @NotBlank @Size(max = 200) @Pattern(regexp = "^/[^?#]*$") String rota)`.
- Resposta: 204. Loga em `WARN` no logger `dev.lmaciel.aprumo.diagnostico` no formato `erro no front rota={} mensagem={} pilha={}`, com `\r` e `\n` trocados por espaço e a pilha cortada em 1000 caracteres. Não grava no banco nem loga IP ou usuário.
- Pública, sem sessão: erros podem acontecer antes do login. Se o filtro de CSRF ou Origin já protege os POST públicos (como no `/api/auth/login`), segue o mesmo caminho.
- `LimiteRelatos`: balde em memória por IP (`IpDoCliente.de(request)`), 20 relatos a cada 10 min. Acima disso, 429 pelo `MuitasTentativasException`. Os baldes vencidos são limpos no próprio uso. Mapa limitado a 10 000 IPs: quando enche, limpa tudo *(escolha do Claude)*.
- [ ] Testes que falham: 204 com corpo válido e sem sessão; 400 com `rota` contendo `?`; 400 com `mensagem` acima de 500; 429 no 21º pedido do mesmo IP; quebra de linha na mensagem não gera nova linha no log (usar `OutputCaptureExtension`).
- [ ] Implementar, passar e fazer commit `feat(diagnostico): endpoint de relato de erros do front`.

### Tarefa 2.2 (frontend-developer): enviar os erros

**Arquivos:** criar `frontend/src/diagnostico/relatarErro.ts` e `.test.ts`; alterar `main.tsx` (passa `aoErro` ao `LimiteDeErro` e instala `instalarRelatoGlobal()`).

- `relatarErro(erro: unknown, pilhaComponentes?: string): void`: monta `{ mensagem, pilha, rota: location.pathname }`, corta nos limites do back e envia com `fetch('/api/diagnostico/erros', { method: 'POST', keepalive: true, ... })` direto, sem o cliente com retentativa. Engole falhas. No máximo 5 envios por carga de página e ignora mensagem repetida. Só envia em `import.meta.env.PROD`.
- `instalarRelatoGlobal(): void`: escuta `window` `error` e `unhandledrejection` e chama `relatarErro`.
- [ ] Testes (msw) que falham: envia rota sem query; corta a mensagem em 500; o 6º erro não envia; mensagem repetida não envia; falha 500 do servidor não lança.
- [ ] Implementar, passar e fazer commit `feat(front): relata erros inesperados à API`.

### Tarefa 2.3 (frontend-developer): política e ficha

- `frontend/src/legal/PrivacidadePage.tsx`: na parte do que é coletado, acrescentar "Quando o app encontra um erro inesperado, enviamos ao nosso servidor a mensagem técnica do erro e a tela em que ele aconteceu, sem seus dados pessoais nem o conteúdo dos seus registros, para corrigir o problema." Ajustar o teste da página.
- `docs/play-store/ficha-da-loja.md`: tirar "diagnósticos de falhas" da lista de não coletados e declarar "Registros de falhas: coletado, não compartilhado, obrigatório, finalidade: funcionalidade do app/análise".
- [ ] Commit `docs(legal): declara o relato de erros`.

## PR 3: `feat/exportar-dados` (back e front)

### Tarefa 3.1 (java-spring): `GET /api/auth/conta/exportacao`

**Arquivos:** novo `backend/src/main/java/dev/lmaciel/aprumo/exportacao/` (`ExportacaoController`, `ExportacaoService`, `dto/ExportacaoResponse`); teste de integração.

- Autenticada. Resposta JSON com `Content-Disposition: attachment; filename="aprumo-dados-AAAA-MM-DD.json"` (data do `Clock`) e `Cache-Control: no-store`.
- Conteúdo: `{ geradoEm, usuario: { nome, email, criadoEm }, categorias, cartoes, lancamentos, saldos, tarefas, notas (com categorias de nota), projetos (com estágios e subtarefas) }`. Usa os repositórios existentes, sempre filtrando pelo usuário logado, e DTOs próprios da exportação. Nunca serializa entidade direto.
- Fora da exportação: hash da senha, códigos de e-mail, versão de sessão e ids internos de outros usuários.
- Leitura em `@Transactional(readOnly = true)`.
- [ ] Testes que falham: 401 sem sessão; com dois usuários, A recebe só os dados de A; o JSON não contém `senha`, `hash`, `codigo` nem `sessao`; os cabeçalhos `Content-Disposition` e `no-store` estão presentes.
- [ ] Implementar, passar e fazer commit `feat(conta): exportação dos dados em JSON`.

### Tarefa 3.2 (frontend-developer): botão "Exportar meus dados"

**Arquivos:** criar `frontend/src/auth/useExportarDados.ts` e teste; alterar `frontend/src/paginas/mais/MaisPage.tsx` (grupo conta, antes de "Excluir conta") e `frontend/src/layout/DockLateral.tsx` (rodapé, mesmo estilo de "Alterar senha"); ícone de download.

- `useExportarDados(): { exportar: () => Promise<void>; exportando: boolean; erro: string | null }`. Faz o GET, lê o blob e baixa por `URL.createObjectURL`, com o nome vindo do `Content-Disposition` (padrão `aprumo-dados.json`). Desabilita o botão enquanto exporta. Em caso de falha, mostra "Não foi possível exportar. Tente de novo."
- `PrivacidadePage.tsx`: no item "portabilidade dos seus dados", acrescentar "(use Exportar meus dados, no menu)".
- [ ] Testes que falham: o clique chama a API e cria o link com o nome do cabeçalho; mostra a mensagem de erro no 500; o botão fica desabilitado durante a exportação.
- [ ] Implementar, passar e fazer commit `feat(conta): botão para exportar os dados`.

## PR 4: `fix/dividas-pre-lancamento`

Para cada item: verificar antes se ainda existe e pular se já foi resolvido (dizer qual foi pulado). Um commit por item.

- **4.1 (java-spring)** `AuthService.definirSenha`: BCrypt e validação do Google fora da `@Transactional`, como o `redefinirSenha` já faz em `FluxoEmailService`. Os testes atuais continuam verdes, mais um teste do comportamento inalterado.
- **4.2 (java-spring)** `NotaService`: fixar nota com `CannotAcquireLockException` ou `PessimisticLockingFailureException` responde 409 (`ConflitoException`). O teste de unidade simula a exceção no repositório.
- **4.3 (java-spring)** busca de notas: `@Size(max = 100)` no parâmetro de busca, com 400 acima disso. Paginação fica fora deste PR.
- **4.4 (frontend-developer)** `manifest.webmanifest`: `icons` nos dois `shortcuts` (usar `/icon-192.png`, 192x192).
- **4.5 (frontend-developer)** retirar `vi.stubGlobal('matchMedia', undefined)` desnecessário de `Sidebar`, `PaletaNavegacao` e `AppShell`, se ainda estiver lá.
- **4.6 (frontend-developer)** `NotaFixadaLote.test.tsx` flaky: achar a causa (provável timeout ou `waitFor` curto sob carga) com `superpowers:systematic-debugging` e corrigir. Rodar 5 vezes seguidas, todas verdes.

## O que fica com o Lucas (sem código)

- Abrir o app no S24+ e conferir: o botão voltar na tela Início fecha o app; com modal aberto, o voltar não deixa o app num estado estranho; o modo avião mostra a página offline (depois do deploy do PR 1).
- Conferir as telas vazias com a conta de revisor (Início, Orçamento, Cartões, Tarefas e Notas já têm texto de vazio no código).

## Ordem e fechamento

PR 1, depois o PR 2 (a partir do PR 1); os PRs 3 e 4 em paralelo, em worktrees próprios. Em cada PR: `code-reviewer` no diff da branch; `security-auditor` nos PRs 2 e 3 (entrada externa e dados pessoais). Em seguida, rodar os testes e o build completos, fazer push e abrir o PR.
