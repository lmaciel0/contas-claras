# Timeout de Inatividade de 30 Minutos e Redução de Validade da Sessão: Design Document

Data: 2026-11-02  
Status: Aprovado  
Alvo: `contas-claras` (Aprumo)

## 1. Contexto e Problema

O Aprumo é um sistema de gestão financeira pessoal e produtividade. Atualmente:
- O cookie de sessão HTTP-only (`cc_session`) e o token JWT emitido pelo backend possuem validade estática de **30 dias** (`TokenService.VALIDADE = Duration.ofDays(30)`).
- Não há controle de expiração por inatividade nem no front-end nem no back-end.
- Ao deixar o notebook suspenso ou com a aba aberta durante a noite, quando o usuário abre o computador no dia seguinte, a aba acorda o servidor do cold sleep e continua diretamente logada sem exigir nova autenticação.
- Em aplicações com dados financeiros e pessoais sensíveis, sessões abandonadas ou máquinas suspensas representam um risco de segurança. O comportamento esperado é que a sessão expire após **30 minutos** sem interação ativa do usuário.

## 2. Decisão de Arquitetura

Adotamos a estratégia de **defesa em profundidade**:

### 2.1 Front-end: Guardião de Inatividade (`useTimeoutInatividade`)
- **Hook / Mecanismo de Inatividade**:
  - Ativo apenas enquanto houver usuário autenticado (`usuario !== null`).
  - Registra e atualiza o timestamp da última interação do usuário (`Date.now()`) na chave `localStorage` `aprumo-ultima-atividade`.
  - Escuta eventos globais de interação no `window`: `pointerdown`, `keydown`, `scroll`, `touchstart`.
  - As gravações em `localStorage` são limitadas por *throttle* (máximo 1 gravação a cada 5 segundos) para não impactar performance.
  - Sincronização entre abas: escuta o evento `storage` na chave `aprumo-ultima-atividade`. Se o usuário estiver ativo na aba A, a aba B lê a atualização e também adia a expiração.
- **Detecção de Retomada e Sono (*Sleep / Wake-up*)**:
  - Quando o notebook é suspenso, temporizadores JS (`setInterval`) congelam. Ao abrir o notebook, o navegador dispara `visibilitychange` e `focus`.
  - Ao disparar `visibilitychange` (quando a aba volta a ser visível) ou `focus`, calcula imediatamente:
    `const inativo = Date.now() - ultimaAtividade >= 30 * 60 * 1000;`
  - Uma checagem periódica (`setInterval` a cada 15 segundos) também valida o mesmo cálculo enquanto a aba estiver visível e parada.
- **Fluxo de Expiração**:
  - Quando `inativo === true`:
    1. Limpa o timestamp `aprumo-ultima-atividade` do `localStorage`.
    2. Executa `auth.sair()` (que chama `POST /api/auth/logout` para remover o cookie `cc_session`, define `usuario = null` e limpa o cache do React Query).
    3. Redireciona o usuário para `/login` passando uma mensagem clara no estado da rota ou exibindo o aviso: *"Sua sessão expirou por inatividade (30 minutos). Faça login novamente."*
  - **Cold Start Preservado**: A checagem ocorre imediatamente no front-end na retomada da aba, **antes** de qualquer requisição de dados acordar o servidor na nuvem sem necessidade.

### 2.2 Back-end: Validade do Token (`TokenService` e `SessaoCookie`)
- Redução da validade máxima do JWT e do `maxAge` do cookie de **30 dias** para **24 horas** (`Duration.ofHours(24)`).
- Isso garante que, mesmo que o front-end seja contornado ou um token persista em disco, nenhuma sessão sobrevive a um ciclo de 24 horas sem reautenticação.

## 3. Experiência do Usuário (UX)
- Durante o uso normal, o usuário não percebe nenhuma interrupção; cliques, toques e digitação renovam silenciosamente o cronômetro.
- Se o usuário ficar ausente por mais de 30 minutos, ao retornar ou reabrir o computador, ele vê a tela de login com uma mensagem contextual explicativa, sem erros 500 ou telas quebradas.
