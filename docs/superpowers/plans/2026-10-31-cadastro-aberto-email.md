# Cadastro aberto com e-mail confirmado: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sair com reação imediata; cadastro aberto com confirmação por e-mail (código ou link); Google por ícone; recuperação de senha por código; telas de auth com novo visual e animação.

**Architecture:** Cadastro pendente e código de senha ficam em `codigo_email`, fora de `usuario`. `FluxoEmailService` orquestra as regras e `LimiteEnvio` conta envios no banco, porque a API roda em várias instâncias. O envio passa pela interface `EnvioEmail` (Gmail por SMTP em produção). No front, uma rota-layout `LayoutAuth` mantém card e Google fixos e anima a troca de telas.

**Tech Stack:** Spring Boot 4.1.2, `spring-boot-starter-mail`, Flyway, Testcontainers; React 19, React Router 8, Tailwind 4, Vitest, MSW; Vercel Services, Supabase.

**Spec:** `docs/superpowers/specs/2026-10-31-cadastro-aberto-email-design.md`

## Global Constraints

- Quem escreve: todo `.java` pelo agent `java-spring`; todo front-end pelo agent `frontend-developer`. TDD em tudo.
- Backend no pacote `dev.lmaciel.contasclaras.auth`, plano como o atual; DTOs em `auth/dto`. Comentários, nomes e mensagens em PT-BR.
- Código: 6 dígitos, com zeros à esquerda, `SecureRandom`, 15 min, 5 tentativas, uso único.
- Limites: 1 envio a cada 60 s por e-mail (`202` sem enviar); 3/h por e-mail, 10/h por IP e 300 em 24 h (`429`).
- Mensagens exatas: `400` "Código inválido ou expirado."; `429` "Muitos pedidos agora. Tente de novo mais tarde."; `503` "Não foi possível enviar o e-mail. Tente de novo."
- Instantes de `criado_em` e `expira_em` vêm do `Clock` injetado, nunca do `default now()`, porque os testes usam relógio fixo.
- Em produção, código e link nunca vão para log. SMTP roda dentro da requisição e fora de transação.
- Sem dependência nova no front. Nada de código ou link em URL além de `?token=` em `/confirmar`, removido ao ler.

## Review Focus

1. E-mail com maiúsculas ou espaços em qualquer passo: a pessoa cai na mesma pendência e na mesma conta (teste na Task 5).
2. Código colado com espaços, como `123 456`: é aceito, porque o front manda só os dígitos (teste na Task 8).
3. Link aberto de novo ou vencido: mostra "Código inválido ou expirado." e um caminho para refazer o cadastro, sem tela quebrada (teste na Task 8).
4. Duas confirmações simultâneas do mesmo cadastro: uma conta só, e a outra recebe o erro genérico, nunca `500` (teste na Task 5).
5. Recarregar `/confirmar` sem o estado da rota: o campo de e-mail fica vazio e editável, e o fluxo segue (teste na Task 8).

---

### Task 1: Sair com reação imediata

Agent: `frontend-developer`.

**Files:**
- Modify: `frontend/src/App.tsx` (`MolduraDoUsuario`), `frontend/src/layout/MenuUsuario.tsx`
- Test: `frontend/src/auth/Sair.test.tsx`

**Interfaces:**
- Consumes: `aoSair: () => void` de `MenuUsuario`, sem mudança de assinatura.
- Produces: nada para outras tasks.

- [ ] **Step 1: Write the failing tests** (renderize `<AuthProvider><App /></AuthProvider>` em `/conta/senha`, que não faz consultas, com sessão ativa pelo helper de `teste/auth.ts`)

```tsx
it('sair_fecha_o_menu_mostra_saindo_e_ignora_clique_repetido', async () => {
  // handler de logout segura a resposta até `liberar()` e conta `chamadas`
  await abrirMenuEClicarEmSair()
  expect(screen.getByRole('status')).toHaveTextContent('Saindo…')
  expect(screen.getByRole('button', { name: /Menu do usuário/ })).toHaveAttribute('aria-expanded', 'false')
  await abrirMenuEClicarEmSair()
  expect(chamadas).toBe(1)
  liberar()
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
})

it('sair_com_falha_mostra_o_erro_e_aceita_novo_clique', async () => {
  // logout responde 500 uma vez, depois 204
  await abrirMenuEClicarEmSair()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair. Tente de novo.')
  await abrirMenuEClicarEmSair()
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/auth/Sair.test.tsx`
Expected: FAIL, sem elemento `status`.

- [ ] **Step 3: Implement**

`MenuUsuario`: o botão Sair chama `fechar()` e depois `aoSair()`. `MolduraDoUsuario`: estado `saindo` mais um `useRef` que ignora chamada em andamento; mostra `<p role="status">Saindo…</p>` na mesma posição fixa do aviso de erro; zera os dois em falha.

- [ ] **Step 4: Run to verify they pass**

Run: `cd frontend && npx vitest run src/auth/Sair.test.tsx src/layout/AppShell.test.tsx src/auth/AuthProvider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix(web): Sair mostra progresso e ignora clique repetido"`

### Task 2: Pool de conexões por instância

Agent: `java-spring`.

**Files:**
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/PoolConexoesTest.java`

**Interfaces:** nenhuma.

- [ ] **Step 1: Write the failing test**

```java
class PoolConexoesTest extends IntegracaoTest {
    @Autowired HikariDataSource dataSource;

    @Test
    void cada_instancia_abre_no_maximo_duas_conexoes() {
        assertThat(dataSource.getMaximumPoolSize()).isEqualTo(2);
        assertThat(dataSource.getMinimumIdle()).isZero();
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./mvnw -q test -Dtest=PoolConexoesTest`
Expected: FAIL, tamanho 10.

- [ ] **Step 3: Implement**

Em `spring.datasource.hikari`: `maximum-pool-size: 2`, `minimum-idle: 0`, com comentário citando o limite de 15 conexões do session pooler.

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && ./mvnw -q test -Dtest=PoolConexoesTest`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix(api): limita o pool a 2 conexões por instância"`

### Task 3: Fundação de e-mail (dados, criptografia, envio)

Agent: `java-spring`.

**Files:**
- Create em `backend/src/main/java/dev/lmaciel/contasclaras/auth/`: `TipoCodigo`, `CodigoEmail`, `CodigoEmailRepository`, `RegistroEnvio`, `RegistroEnvioRepository`, `CodigosEmail`, `MensagemEmail`, `ModelosEmail`, `EnvioEmail`, `SmtpEnvioEmail`, `ConsoleEnvioEmail`
- Create: `backend/src/main/resources/db/migration/V4__codigo_email.sql` (SQL exato da spec, parte "Dados")
- Create: `comum/EmailIndisponivelException.java`
- Modify: `comum/ApiExceptionHandler.java`, `backend/pom.xml`, `application.yml`
- Test: `auth/CodigosEmailTest.java`, `auth/ModelosEmailTest.java`, `auth/SmtpEnvioEmailTest.java`, `auth/EnvioEmailFalso.java`; Modify: `IntegracaoTest.java` (`@Import(EnvioEmailFalso.class)`)

**Interfaces:**
- Produces:
  - `enum TipoCodigo { CADASTRO, SENHA }`
  - `CodigoEmailRepository`: `Optional<CodigoEmail> findByTipoAndEmail(TipoCodigo, String)`; `Optional<CodigoEmail> findByTokenHash(String)`; versões com `@Lock(PESSIMISTIC_WRITE)` `buscarParaConferir(TipoCodigo, String)` e `buscarPorTokenParaConferir(String)`; `void deleteByExpiraEmBefore(Instant)`
  - `RegistroEnvioRepository`: `long countByEmailHmacAndCriadoEmAfter(String, Instant)`; `long countByIpHmacAndCriadoEmAfter(String, Instant)`; `long countByCriadoEmAfter(Instant)`; `Optional<RegistroEnvio> findFirstByEmailHmacOrderByCriadoEmDesc(String)`; `void deleteByCriadoEmBefore(Instant)`
  - `CodigosEmail`: `String gerarCodigo()`; `String hmacCodigo(TipoCodigo, String email, String codigo)`; `String gerarToken()`; `String hashToken(String)`; `String hmac(String valor)`; `boolean iguais(String, String)`
  - `record MensagemEmail(String para, String assunto, String texto, String html)`
  - `ModelosEmail`: `codigoCadastro(para, nome, codigo, token)`; `contaJaExiste(para)`; `codigoSenha(para, codigo)`; `semConta(para)`, todos devolvendo `MensagemEmail`
  - `interface EnvioEmail { void enviar(MensagemEmail mensagem); }`, que lança `EmailIndisponivelException`
  - Teste: `EnvioEmailFalso` (`@Primary`), com `List<MensagemEmail> enviadas()`, `void falharNoProximo()`, `void limpar()`

- [ ] **Step 1: Write the failing tests**

```java
// CodigosEmailTest
void codigo_tem_sempre_6_digitos();                  // regex \d{6} em 1000 gerações
void hmac_muda_com_tipo_email_e_codigo();
void hmac_nao_contem_o_codigo();
void token_tem_ao_menos_43_caracteres_base64url();

// ModelosEmailTest
void cadastro_traz_codigo_link_validade_e_aviso();   // texto e html contêm codigo, APP_URL + "/confirmar?token=", "15 minutos", "Se não foi você, ignore este e-mail"
void assunto_nunca_contem_o_codigo();                // nos modelos com código
void conta_ja_existe_aponta_para_esqueci_a_senha();
void sem_conta_nao_traz_codigo();

// SmtpEnvioEmailTest (JavaMailSender de Mockito)
void sem_usuario_configurado_lanca_email_indisponivel();
void falha_do_mail_sender_vira_email_indisponivel();
void envia_multipart_com_texto_e_html_e_remetente_contas_claras();

// ApiExceptionHandler, em SmtpEnvioEmailTest ou no teste atual do handler
void email_indisponivel_responde_503_com_a_mensagem_exata();
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest='CodigosEmailTest,ModelosEmailTest,SmtpEnvioEmailTest'`
Expected: FAIL de compilação.

- [ ] **Step 3: Implement**

- `pom.xml`: `spring-boot-starter-mail`.
- `application.yml`: `spring.mail` com `host: smtp.gmail.com`, `port: 587`, `username: ${MAIL_USERNAME:}`, `password: ${MAIL_PASSWORD:}`, `properties[mail.smtp.auth]: true`, `properties[mail.smtp.starttls.enable]: true`, `properties[mail.smtp.starttls.required]: true`, timeouts `connectiontimeout`/`timeout`/`writetimeout` de `10000`; e `app.url: ${APP_URL:http://localhost:5173}`.
- `CodigosEmail`: chave = HMAC-SHA256(`app.jwt.secret`, `"codigo-email"`); `hmacCodigo` assina `tipo|email|codigo`; saída em hex (64 caracteres); `iguais` usa `MessageDigest.isEqual`.
- `SmtpEnvioEmail` (`@Profile("!dev")`): `username` em branco lança a exceção e registra aviso sem dados da mensagem; `ConsoleEnvioEmail` (`@Profile("dev")`) escreve a mensagem no log.
- `EmailIndisponivelException` (`comum`): mensagem `503` exata, tratada no `ApiExceptionHandler`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd backend && ./mvnw -q test -Dtest='CodigosEmailTest,ModelosEmailTest,SmtpEnvioEmailTest'`
Expected: PASS, com a migração `V4` aplicada e `ddl-auto: validate` aceitando as entidades.

- [ ] **Step 5: Commit**

`git commit -m "feat(api): fundação de envio de e-mail e códigos"`

### Task 4: Limite de envios no banco

Agent: `java-spring`.

**Files:**
- Create: `auth/LimiteEnvio.java`
- Modify: `comum/MuitasTentativasException.java` (construtor com mensagem; o sem argumento continua igual)
- Test: `auth/LimiteEnvioTest.java`

**Interfaces:**
- Consumes: `RegistroEnvioRepository`, `CodigosEmail.hmac`, `Clock`.
- Produces: `Optional<Long> reservar(String email, String ip)`, com o id do registro ou vazio dentro dos 60 s (nesse caso, responder `202` sem enviar); lança `MuitasTentativasException` com a mensagem `429`. `void liberar(long registroId)` desfaz a reserva depois de falha de SMTP.

- [ ] **Step 1: Write the failing tests**

Avance o tempo editando `criado_em` por SQL, porque o relógio de teste é fixo.

```java
void primeira_reserva_grava_registro_com_hmac_sem_email_nem_ip_em_claro();
void segunda_reserva_em_menos_de_60s_devolve_vazio();
void quarto_envio_na_hora_do_mesmo_email_lanca_429();
void decimo_primeiro_envio_na_hora_do_mesmo_ip_lanca_429();
void envio_301_em_24h_lanca_429_para_qualquer_email_e_ip();
void liberar_apaga_o_registro_e_permite_reserva_imediata();
void registros_com_mais_de_24h_sao_apagados_na_reserva();
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest=LimiteEnvioTest`
Expected: FAIL de compilação.

- [ ] **Step 3: Implement `LimiteEnvio`**

Ordem das checagens: global, IP, 60 s, hora por e-mail, porque só o prazo de 60 s responde em silêncio. Constantes: `INTERVALO_MINIMO = 60 s`, `MAX_POR_EMAIL_HORA = 3`, `MAX_POR_IP_HORA = 10`, `MAX_GLOBAL_24H = 300`. Em uma corrida o contador pode passar um pouco do limite; a margem abaixo dos 500 do Gmail cobre isso.

- [ ] **Step 4: Run to verify they pass**

Run: `cd backend && ./mvnw -q test -Dtest=LimiteEnvioTest`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(api): limite de envios de e-mail no banco"`

### Task 5: Cadastro confirmado por e-mail e fim da lista

Agent: `java-spring`.

**Files:**
- Create: `auth/FluxoEmailService.java`, `auth/dto/EmailRequest.java`, `auth/dto/ConfirmarCadastroRequest.java`
- Modify: `auth/AuthController.java`, `auth/AuthService.java`, `auth/SecurityConfig.java` (`rotasPublicas`), `demo/DemoSeeder.java` (Javadoc), `application.yml` (tira `app.allowed-emails`)
- Delete: `auth/EmailsLiberados.java`, `auth/EmailsLiberadosTest.java`
- Test: Create `auth/CadastroEmailTest.java`; Modify `IntegracaoTest.java`, `auth/AuthControllerTest.java`, `auth/CadastroSemEnumeracaoTest.java`, `auth/GoogleLoginTest.java`

**Interfaces:**
- Consumes: Task 3 e `LimiteEnvio.reservar/liberar`; `AuthService.criarUsuario(nome, email, senhaHash, googleSub)`.
- Produces:
  - `FluxoEmailService`: `void pedirCadastro(String nome, String email, String senha, String ip)`; `void reenviarCadastro(String email, String ip)`; `Usuario confirmarCadastro(String email, String codigo)`; `Usuario confirmarCadastroPorToken(String token)`
  - `AuthService.hashDaSenha(String)` passa a package-private; `AuthService.cadastrar` sai
  - `record EmailRequest(String email)`, com as validações e o `trim` de `CadastroRequest`; `record ConfirmarCadastroRequest(String email, String codigo, String token)`, com `codigo` em `@Pattern("\\d{6}")` e `token` em `@Size(max = 64)`, ambos com a mensagem `400` exata
  - Rotas públicas novas: `/api/auth/cadastro/reenviar`, `/api/auth/cadastro/confirmar`

- [ ] **Step 1: Prepare a base de testes**

Em `IntegracaoTest`: tire `app.allowed-emails` e `EMAILS_LIBERADOS_TESTE`; no `@BeforeEach`/`@AfterEach`, apague `codigo_email` e `envio_email` e chame `EnvioEmailFalso.limpar()`. `cadastrarEEntrar(email)` passa a criar a conta por `AuthService.criarUsuario` com a senha em BCrypt e entrar por `POST /api/auth/login`.

- [ ] **Step 2: Write the failing tests**

```java
// CadastroEmailTest
void cadastro_novo_responde_202_sem_cookie_sem_criar_usuario_e_envia_codigo_e_link();
void email_com_conta_responde_202_igual_e_envia_aviso_sem_codigo();
void confirmar_com_codigo_certo_responde_201_com_cookie_e_cria_11_categorias();
void confirmar_com_token_certo_responde_201_com_cookie();
void email_com_maiusculas_e_espacos_cai_na_mesma_pendencia();            // Review Focus 1
void codigo_vencido_responde_400_generico();                             // expira_em ajustado por SQL
void quinta_tentativa_errada_apaga_o_codigo_e_sexta_com_o_certo_falha(); // o incremento precisa persistir
void codigo_e_de_uso_unico();
void token_desconhecido_responde_400_generico();
void confirmar_sem_codigo_nem_token_responde_400();
void confirmacoes_simultaneas_criam_uma_conta_e_nunca_respondem_500();   // Review Focus 4
void conta_criada_pelo_google_antes_da_confirmacao_apaga_pendencia_e_responde_400();
void reenvio_com_pendencia_troca_codigo_e_link_e_mantem_nome_e_senha();  // o código antigo passa a falhar
void reenvio_sem_pendencia_responde_202_sem_enviar();
void pedido_em_menos_de_60s_responde_202_sem_enviar_e_mantem_o_codigo();
void falha_de_smtp_responde_503_e_nao_consome_o_prazo_de_60s();
void quarto_pedido_na_hora_responde_429_com_a_mensagem_exata();
void codigo_e_token_nao_aparecem_no_log();                               // OutputCaptureExtension

// CadastroSemEnumeracaoTest, reescrito
void com_ou_sem_conta_gasta_bcrypt_responde_igual_e_envia_um_email();

// GoogleLoginTest
void google_primeiro_login_com_qualquer_email_verificado_cria_conta();   // substitui google_email_nao_liberado_retorna_403
```

Em `AuthControllerTest`: os testes `cadastro_*` de validação continuam (`400`); os de sucesso e os que citam lista saem, cobertos por `CadastroEmailTest`.

- [ ] **Step 3: Run to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest='CadastroEmailTest,CadastroSemEnumeracaoTest,GoogleLoginTest,AuthControllerTest'`
Expected: FAIL.

- [ ] **Step 4: Implement**

`FluxoEmailService` não é transacional: usa `TransactionTemplate` só nos trechos de banco e envia o e-mail fora deles. Pedido de cadastro, nesta ordem:

```text
hash = authService.hashDaSenha(senha)    // sempre, também para e-mail com conta
reserva = limite.reservar(email, ip)     // vazio: retorna 202 sem enviar
tx: apaga vencidos; com conta -> sem pendência; sem conta -> upsert por (CADASTRO, email)
envia (código + link, ou aviso); falhou -> limite.liberar(reserva) e relança
```

Conferência: a transação faz `buscarParaConferir`, compara, incrementa `tentativas` e apaga a linha na quinta tentativa errada ou no acerto. **Ela só devolve o resultado; a exceção `400` é lançada depois do commit**, senão o incremento sofreria rollback. Criar a conta acontece na mesma transação do acerto. `DataIntegrityViolationException` ou `ConflitoException` de `criarUsuario` viram o `400` genérico.

Controller: `cadastro` responde `202` sem corpo, com `HttpServletRequest.getRemoteAddr()` como IP; `confirmar` usa `comSessao(CREATED, usuario)`. `AuthService.entrarComGoogle` perde a checagem da lista.

- [ ] **Step 5: Run to verify they pass**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, com a suíte inteira verde.

- [ ] **Step 6: Commit**

`git commit -m "feat(api): cadastro aberto confirmado por e-mail"`

### Task 6: Esqueci a senha

Agent: `java-spring`.

**Files:**
- Modify: `auth/FluxoEmailService.java`, `auth/AuthController.java`, `auth/SecurityConfig.java`
- Create: `auth/dto/RedefinirSenhaRequest.java`
- Test: `auth/EsqueciSenhaTest.java`

**Interfaces:**
- Consumes: `ModelosEmail.codigoSenha/semConta`; `AuthService.hashDaSenha`; `Usuario.invalidarSessoes`.
- Produces: `void esqueciSenha(String email, String ip)`; `Usuario redefinirSenha(String email, String codigo, String senha)`; `record RedefinirSenhaRequest(String email, String codigo, String senha)`; rotas públicas `/api/auth/esqueci-senha` (`202`) e `/api/auth/redefinir-senha` (`200`, cookie e `UsuarioResponse`).

- [ ] **Step 1: Write the failing tests**

```java
void email_com_conta_responde_202_e_envia_codigo();
void email_sem_conta_responde_202_igual_e_envia_aviso_sem_codigo();
void codigo_certo_troca_a_senha_entra_e_derruba_sessoes_antigas(); // cookie antigo em /me responde 401
void senha_antiga_para_de_funcionar_e_a_nova_entra();
void conta_so_com_google_pode_definir_senha();
void senha_fora_do_tamanho_responde_400_sem_consumir_tentativa();
void quinta_tentativa_errada_apaga_o_codigo();
void codigo_de_cadastro_nao_serve_para_redefinir();
void email_sem_conta_responde_400_generico_ao_redefinir();
void pedido_em_menos_de_60s_responde_202_sem_enviar();
void falha_de_smtp_responde_503();
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest=EsqueciSenhaTest`
Expected: FAIL.

- [ ] **Step 3: Implement**

Reaproveite a reserva, o envio e a conferência da Task 5. Extraia métodos privados em `FluxoEmailService` se ajudar; o tipo `SENHA` não usa `nome`, `senha_hash` nem `token_hash`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

`git commit -m "feat(api): recuperação de senha por código"`

### Task 7: Layout, visual, animação e ícone do Google

Agent: `frontend-developer`.

**Files:**
- Create: `frontend/src/auth/LayoutAuth.tsx`
- Modify: `frontend/src/auth/TelaAuth.tsx`, `frontend/src/auth/BotaoGoogle.tsx`, `frontend/src/auth/LoginPage.tsx`, `frontend/src/auth/CadastroPage.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`
- Test: `frontend/src/auth/LayoutAuth.test.tsx`; Modify: `frontend/src/auth/BotaoGoogle.test.tsx`

**Interfaces:**
- Consumes: `TelaCarregando`, `AvisoServidor`, `MensagemDeErro`.
- Produces: `LayoutAuth`, rota-layout com `<Outlet />`, única dona de `carregando`, marca, card e Google. `TelaAuth({ titulo, children })` passa a renderizar só o `<h1>` e o conteúdo. As páginas seguem cuidando do `<Navigate>` de quem tem sessão.

- [ ] **Step 1: Write the failing tests**

```tsx
it('avancar_de_login_para_cadastro_anima_para_a_direita', ...)   // área animada com classe auth-entra-direita
it('voltar_de_cadastro_para_login_anima_para_a_esquerda', ...)   // classe auth-entra-esquerda
it('primeira_tela_nao_anima', ...)                               // sem as duas classes
it('google_aparece_em_login_e_cadastro_e_nao_em_confirmar', ...) // data-testid botao-google, com VITE_GOOGLE_CLIENT_ID
it('sem_client_id_nao_mostra_o_texto_ou_continue_com', ...)
it('erro_do_google_aparece_no_card', ...)
it('css_desliga_a_animacao_com_reduced_motion', () => {
  expect(css).toMatch(/prefers-reduced-motion[\s\S]*auth-entra/) // import css from '../index.css?raw'
})
// BotaoGoogle.test.tsx
it('renderiza_o_icone_redondo', ...) // renderButton com objectContaining({ type: 'icon', shape: 'circle' })
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/auth/LayoutAuth.test.tsx src/auth/BotaoGoogle.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `App.tsx`: `<Route element={<LayoutAuth />}>` com as rotas `/login` e `/cadastro`.
- `LayoutAuth`: área animada com `key={pathname}`; direção pela ordem `['/login', '/cadastro', '/confirmar', '/esqueci-senha']`, guardando o índice anterior em `useRef`. Google e o texto "ou continue com" ficam fora da área animada e só aparecem em `/login` e `/cadastro`.
- `BotaoGoogle`: `type: 'icon'`, `shape: 'circle'`, `theme: 'outline'`, `size: 'large'`.
- `index.css`, classes novas fora de `@layer`, para vencer as utilities:

| Classe | Valores |
|---|---|
| `.auth-card` | `border-radius: 40px`; `padding: 25px 35px`; `border: 5px solid #fff`; `background: linear-gradient(0deg, #fff 0%, rgb(244 247 251) 100%)`; `box-shadow: rgb(39 24 126 / 25%) 0 30px 30px -20px` |
| `.auth-card h1` | `font-size: 30px`; `font-weight: 900`; `color: var(--cor-principal)`; centralizado |
| `.auth-card input` | `border: 0`; `border-inline: 2px solid transparent`; `border-radius: 20px`; `padding: 15px 20px`; `box-shadow: rgb(39 24 126 / 12%) 0 10px 10px -5px`; no foco, `border-inline-color: var(--cor-principal)` |
| `.auth-card button[type='submit']` | `background: linear-gradient(45deg, var(--cor-principal) 0%, #4a36c4 100%)`; `border-radius: 20px`; `padding-block: 15px`; `transform: scale(1.03)` no hover e `scale(0.95)` no active; transição de 0.2s |
| `.auth-entra-direita`, `.auth-entra-esquerda` | deslize de 24 px com fade em 300 ms; `prefers-reduced-motion: reduce` usa `animation: none` |

Rótulos continuam visíveis, nenhum texto abaixo de 12 px, e os inputs mantêm 16 px.

- [ ] **Step 4: Run to verify they pass**

Run: `cd frontend && npx vitest run src/auth`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(web): novo visual das telas de auth, animação e ícone do Google"`

### Task 8: Cadastro com senha repetida e tela de confirmação

Agent: `frontend-developer`.

**Files:**
- Create: `frontend/src/auth/ConfirmarPage.tsx`, `frontend/src/auth/useContagem.ts`
- Modify: `frontend/src/auth/CadastroPage.tsx`, `frontend/src/auth/AuthProvider.tsx`, `frontend/src/auth/useAuth.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/api/tipos.ts`, `frontend/src/App.tsx`, `frontend/src/teste/auth.ts`
- Test: Create `frontend/src/auth/ConfirmarPage.test.tsx`; Modify `CadastroPage.test.tsx`, `AuthProvider.test.tsx`

**Interfaces:**
- Consumes: contratos HTTP das Tasks 5 e 6.
- Produces:
  - `endpoints.auth`: `cadastro` passa a `api<void>`; `reenviarCadastro({ email })`; `confirmarCadastro({ email, codigo } | { token })`, que devolve `UsuarioResponse`; `esqueciSenha({ email })`; `redefinirSenha({ email, codigo, senha })`, que devolve `UsuarioResponse`
  - `Auth`: `cadastrar` não define mais `usuario`; novos `confirmarCadastro(req)` e `redefinirSenha(req)`, que definem
  - `useContagem(): { restante: number; reiniciar: () => void }`, de 60 s até 0

- [ ] **Step 1: Write the failing tests**

```tsx
// CadastroPage.test.tsx
it('senhas_diferentes_bloqueiam_o_envio', ...)        // alerta "As senhas não são iguais."; 0 chamadas à API
it('sucesso_vai_para_confirmar_com_o_email_preenchido_e_fora_da_url', ...)
it('botao_mostra_espera_e_nao_envia_de_novo', ...)    // "Enviando…" desabilitado

// ConfirmarPage.test.tsx
it('codigo_certo_entra_no_app', ...)
it('codigo_colado_com_espacos_envia_so_os_digitos', ...)      // Review Focus 2: corpo com "123456"
it('codigo_incompleto_avisa_sem_chamar_a_api', ...)           // "Digite os 6 dígitos do código."
it('codigo_errado_mostra_a_mensagem_da_api', ...)
it('reenviar_comeca_bloqueado_por_60s_e_libera_depois', ...)  // fake timers
it('sem_estado_da_rota_o_email_fica_vazio_e_editavel', ...)   // Review Focus 5
it('abrir_com_token_nao_chama_a_api_ate_o_clique', ...)
it('token_sai_da_url_ao_abrir', ...)                          // BrowserRouter e history.pushState; location.search fica ""
it('token_invalido_mostra_erro_e_link_para_refazer_o_cadastro', ...) // Review Focus 3
it('com_sessao_vai_para_o_inicio', ...)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/auth/ConfirmarPage.test.tsx src/auth/CadastroPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `CadastroPage`: campo "Repetir senha"; sucesso faz `navigate('/confirmar', { state: { email } })`.
- `ConfirmarPage`, rota dentro de `LayoutAuth`:
  - O token é lido uma vez, em `useState`, e sai da URL com `window.history.replaceState` em um efeito. Com token, mostra só o botão "Confirmar minha conta".
  - Sem token: campos "E-mail" e "Código" (`inputMode="numeric"`, `autoComplete="one-time-code"`), texto "Enviamos um e-mail para {email}. Confira também o spam." (sem e-mail no estado: "Digite o e-mail e o código que enviamos. Confira também o spam."), e botão "Reenviar" com a contagem.
  - O código enviado é `codigo.replace(/\D/g, '')`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd frontend && npx vitest run src/auth`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(web): cadastro com senha repetida e confirmação por código ou link"`

### Task 9: Tela de esqueci a senha

Agent: `frontend-developer`.

**Files:**
- Create: `frontend/src/auth/EsqueciSenhaPage.tsx`
- Modify: `frontend/src/auth/LoginPage.tsx`, `frontend/src/App.tsx`
- Test: `frontend/src/auth/EsqueciSenhaPage.test.tsx`; Modify: `LoginPage.test.tsx`

**Interfaces:**
- Consumes: `endpoints.auth.esqueciSenha`, `Auth.redefinirSenha`, `useContagem`, `senhaValida`.
- Produces: rota `/esqueci-senha` dentro de `LayoutAuth`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('login_tem_link_esqueci_a_senha', ...)
it('passo_1_envia_e_mostra_o_passo_2_com_o_email', ...)
it('passo_2_senhas_diferentes_bloqueiam_o_envio', ...)      // "As senhas não são iguais."
it('passo_2_senha_curta_avisa_sem_chamar_a_api', ...)       // MENSAGEM_SENHA_FORA_DO_TAMANHO
it('passo_2_codigo_certo_entra_no_app', ...)
it('passo_2_codigo_errado_mostra_a_mensagem_da_api', ...)
it('reenviar_comeca_bloqueado_por_60s', ...)
it('botoes_mostram_espera_e_nao_enviam_de_novo', ...)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/auth/EsqueciSenhaPage.test.tsx src/auth/LoginPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Passos em estado local, sem rota nova. Passo 2: campos "Código", "Nova senha", "Repetir nova senha", com o mesmo texto de spam da Task 8. No login, o link "Esqueci a senha" fica logo abaixo do campo de senha.

- [ ] **Step 4: Run to verify they pass**

Run: `cd frontend && npx vitest run && npm run lint && npm run build`
Expected: testes verdes, sem erro de lint, build concluído.

- [ ] **Step 5: Commit**

`git commit -m "feat(web): recuperação de senha por código"`

### Task 10: Documentação

Coordenador, sem código de produto.

**Files:**
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: Atualize `.env.example`**

Tire `ALLOWED_EMAILS`; acrescente `MAIL_USERNAME`, `MAIL_PASSWORD`, `APP_URL`.

- [ ] **Step 2: Atualize o `README.md`**

Troque "Cadastro restrito" (linha 51) por cadastro aberto com confirmação por e-mail, e atualize a lista de variáveis (linha 101).

- [ ] **Step 3: Confira**

Run: `git grep -nE 'ALLOWED_EMAILS|allowed-emails|EmailsLiberados' -- . ':!docs/superpowers'`
Expected: nenhuma linha.

- [ ] **Step 4: Commit**

`git commit -m "docs: cadastro aberto e novas variáveis"`

### Task 11: Revisão, verificação e deploy

Coordenador.

- [ ] **Step 1: Revisão da branch**

Rode `code-reviewer` e `security-auditor` (auth e entrada externa) e corrija pelos agents das Tasks. Foco extra na lista de Review Focus.

- [ ] **Step 2: Verificação local**

Run: `cd backend && ./mvnw -q verify` e `cd frontend && npx vitest run && npm run lint && npm run build`
Expected: tudo verde. Mostre a saída real.

- [ ] **Step 3: Pré-requisitos do dono** (bloqueia o deploy)

O dono cria o Gmail do app com senha de app e o OAuth Client do Google, conforme a spec, e grava os valores em `.local/segredos.env` sem passar pelo chat.

- [ ] **Step 4: Publicar**

Abra o PR e faça o merge. Grave as variáveis na Vercel lendo do arquivo, sem imprimir valores, e só então faça o deploy: `git archive main` para pasta limpa e `vercel deploy --prod`.

- [ ] **Step 5: Verificação em produção**

- Cadastro por código, cadastro por link, Google, esqueci a senha e Sair, no navegador.
- Limite por IP: 11 `POST /api/auth/esqueci-senha` para aliases `+n` do próprio Gmail do app, cada um com `X-Forwarded-For` forjado diferente. Expected: o 11º responde `429`, o que confirma o que a documentação da Vercel diz sobre sobrescrever esse header. Os e-mails só chegam à caixa do app.
- Rode `get_advisors` do Supabase para as tabelas novas.

- [ ] **Step 6: Limpar**

Remova `ALLOWED_EMAILS` da Vercel e atualize a memória do projeto.

### Task 12: Senha só depois da prova de posse (backend)

Decisão do dono depois da revisão, que encontrou tomada de conta por troca de `senha_hash` na pendência. Prevalece sobre as Tasks 5 e 6 onde houver conflito. Roda antes dos Steps 3 a 6 da Task 11.

Agent: `java-spring`.

**Files:**
- Modify: `V4__codigo_email.sql` (tira `senha_hash`; a `V4` ainda não foi a produção), `auth/CodigoEmail.java`, `auth/FluxoEmailService.java`, `auth/AuthController.java`, `auth/dto/CadastroRequest.java`, `auth/dto/ConfirmarCadastroRequest.java`, `auth/ModelosEmail.java`
- Test: `auth/CadastroEmailTest.java`, `auth/CadastroSemEnumeracaoTest.java`, `auth/AuthControllerTest.java`, `auth/ModelosEmailTest.java`

**Interfaces:**
- `record CadastroRequest(String nome, String email)`, sem `senha`.
- `record ConfirmarCadastroRequest(String email, String codigo, String token, String senha)`; `senha` obrigatória, com as mesmas regras de `RedefinirSenhaRequest`.
- `FluxoEmailService`: `pedirCadastro(nome, email, ip)`; `confirmarCadastro(email, codigo, senha)`; `confirmarCadastroPorToken(token, senha)`.

- [ ] **Step 1: Ajuste os testes para o contrato novo**

```java
// CadastroEmailTest
void pendencia_nao_guarda_senha();                                 // a coluna senha_hash não existe mais
void confirmar_define_a_senha_escolhida_e_ela_entra();             // login com a senha enviada na confirmação
void terceiro_nao_consegue_definir_a_senha_da_conta();             // novo POST /cadastro de terceiro; a vítima confirma com o código novo e a senha dela; a senha dela entra
void confirmar_com_token_exige_senha();
void senha_fora_do_tamanho_na_confirmacao_responde_400_sem_consumir_tentativa();
void reenvio_com_pendencia_troca_codigo_e_link_e_mantem_nome();    // substitui reenvio_..._mantem_nome_e_senha

// CadastroSemEnumeracaoTest
void com_ou_sem_conta_nao_gasta_bcrypt_responde_igual_e_envia_um_email();
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest='CadastroEmailTest,CadastroSemEnumeracaoTest,AuthControllerTest,ModelosEmailTest'`
Expected: FAIL.

- [ ] **Step 3: Implement**

Tire a senha do pedido e da pendência. Na confirmação, gere o BCrypt antes da transação; o resto da conferência não muda. O e-mail de cadastro diz que a senha será definida ao confirmar.

- [ ] **Step 4: Run to verify they pass**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

`git commit -m "fix(api): senha do cadastro só depois da prova de posse do e-mail"`

### Task 13: Senha só depois da prova de posse (front)

Agent: `frontend-developer`.

**Files:**
- Modify: `frontend/src/auth/CadastroPage.tsx`, `frontend/src/auth/ConfirmarPage.tsx`, `frontend/src/auth/AuthProvider.tsx`, `frontend/src/auth/useAuth.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/api/tipos.ts`
- Test: `frontend/src/auth/CadastroPage.test.tsx`, `frontend/src/auth/ConfirmarPage.test.tsx`

**Interfaces:**
- Consumes: contrato da Task 12.
- `endpoints.auth`: `cadastro({ nome, email })`; `confirmarCadastro({ email, codigo, senha } | { token, senha })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// CadastroPage.test.tsx
it('cadastro_nao_pede_senha', ...)                        // corpo só com nome e email
// ConfirmarPage.test.tsx
it('confirmar_envia_a_senha_junto_do_codigo', ...)
it('confirmar_com_token_envia_a_senha_junto_do_token', ...)
it('senhas_diferentes_bloqueiam_o_envio', ...)            // "As senhas não são iguais."; 0 chamadas à API
it('senha_curta_avisa_sem_chamar_a_api', ...)             // MENSAGEM_SENHA_FORA_DO_TAMANHO
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/auth/ConfirmarPage.test.tsx src/auth/CadastroPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`CadastroPage` perde os campos de senha. `ConfirmarPage` ganha "Senha" e "Repetir senha" (`autoComplete="new-password"`) nos dois modos. Abrir o link continua sem chamar a API até o clique.

- [ ] **Step 4: Run to verify they pass**

Run: `cd frontend && npx vitest run && npm run lint && npm run build`
Expected: testes verdes, sem erro de lint, build concluído.

- [ ] **Step 5: Commit**

`git commit -m "fix(web): senha do cadastro definida na confirmação"`
