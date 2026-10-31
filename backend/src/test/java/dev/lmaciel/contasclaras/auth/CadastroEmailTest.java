package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;

/** Cadastro aberto confirmado por e-mail: pedido, confirmação por código e por link, reenvio e limites. */
@ExtendWith(OutputCaptureExtension.class)
class CadastroEmailTest extends IntegracaoTest {

    private static final String EMAIL = "ana@exemplo.com";
    private static final String SENHA = "senha-segura-1";
    private static final String INVALIDO = "Código inválido ou expirado.";
    private static final String LIMITE = "Muitos pedidos agora. Tente de novo mais tarde.";
    private static final Pattern CODIGO = Pattern.compile("\\b(\\d{6})\\b");
    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    Clock clock;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    AuthService auth;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    // ---- helpers -----------------------------------------------------------------------

    private ResultActions json(String rota, String corpo) throws Exception {
        return mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private ResultActions pedir(String email) throws Exception {
        return json("/api/auth/cadastro", "{\"nome\":\"Ana Teste\",\"email\":\"%s\"}".formatted(email));
    }

    private ResultActions reenviar(String email) throws Exception {
        return json("/api/auth/cadastro/reenviar", "{\"email\":\"%s\"}".formatted(email));
    }

    private ResultActions confirmarComCodigo(String email, String codigo) throws Exception {
        return confirmarComCodigo(email, codigo, SENHA);
    }

    private ResultActions confirmarComCodigo(String email, String codigo, String senha) throws Exception {
        return json("/api/auth/cadastro/confirmar",
                "{\"email\":\"%s\",\"codigo\":\"%s\",\"senha\":\"%s\"}".formatted(email, codigo, senha));
    }

    private ResultActions confirmarComToken(String token) throws Exception {
        return confirmarComToken(token, SENHA);
    }

    private ResultActions confirmarComToken(String token, String senha) throws Exception {
        return json("/api/auth/cadastro/confirmar", "{\"token\":\"%s\",\"senha\":\"%s\"}".formatted(token, senha));
    }

    private ResultActions login(String email, String senha) throws Exception {
        return json("/api/auth/login", "{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha));
    }

    private MensagemEmail ultimoEmail() {
        List<MensagemEmail> enviadas = emailFalso.enviadas();
        assertThat(enviadas).isNotEmpty();
        return enviadas.get(enviadas.size() - 1);
    }

    private String codigoDoUltimoEmail() {
        Matcher m = CODIGO.matcher(ultimoEmail().texto());
        assertThat(m.find()).as("o e-mail traz um código").isTrue();
        return m.group(1);
    }

    private String tokenDoUltimoEmail() {
        Matcher m = TOKEN.matcher(ultimoEmail().texto());
        assertThat(m.find()).as("o e-mail traz um link").isTrue();
        return m.group(1);
    }

    private long contar(String tabela) {
        return jdbc.queryForObject("select count(*) from " + tabela, Long.class);
    }

    /** O relógio dos testes é fixo: o tempo "passa" empurrando os envios para o passado. */
    private void passarSegundos(long segundos) {
        jdbc.update("update envio_email set criado_em = criado_em - ?::interval", segundos + " seconds");
    }

    private void criarConta(String email) {
        auth.criarUsuario("Dona da Conta", email, encoder.encode("outra-senha-9"), null);
    }

    // ---- pedido ------------------------------------------------------------------------

    @Test
    void cadastro_novo_responde_202_sem_cookie_sem_criar_usuario_e_envia_codigo_e_link() throws Exception {
        pedir(EMAIL)
                .andExpect(status().isAccepted())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(content().string(""));

        assertThat(contar("usuario")).isZero();
        assertThat(emailFalso.enviadas()).hasSize(1);
        MensagemEmail email = ultimoEmail();
        assertThat(email.para()).isEqualTo(EMAIL);
        assertThat(email.texto()).contains("/confirmar?token=");
        assertThat(codigoDoUltimoEmail()).matches("\\d{6}");
        // o banco guarda só o HMAC do código e o hash do token
        var linha = jdbc.queryForMap("select * from codigo_email");
        assertThat(linha.get("tipo")).isEqualTo("CADASTRO");
        assertThat(linha.get("email")).isEqualTo(EMAIL);
        assertThat(linha.get("nome")).isEqualTo("Ana Teste");
        assertThat(linha.toString()).doesNotContain(codigoDoUltimoEmail()).doesNotContain(tokenDoUltimoEmail());
        assertThat(((Timestamp) linha.get("criado_em")).toInstant()).isEqualTo(clock.instant());
        assertThat(((Timestamp) linha.get("expira_em")).toInstant()).isEqualTo(clock.instant().plusSeconds(900));
    }

    @Test
    void pendencia_nao_guarda_senha() throws Exception {
        // mesmo que o cliente mande "senha" no pedido, nada dela chega ao banco
        json("/api/auth/cadastro",
                "{\"nome\":\"Ana Teste\",\"email\":\"%s\",\"senha\":\"%s\"}".formatted(EMAIL, SENHA))
                .andExpect(status().isAccepted());

        List<String> colunas = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'codigo_email'", String.class);
        assertThat(colunas).isNotEmpty().doesNotContain("senha_hash");
        assertThat(jdbc.queryForMap("select * from codigo_email").toString())
                .doesNotContain(SENHA).doesNotContain("$2");
    }

    @Test
    void email_com_conta_responde_202_igual_e_envia_aviso_sem_codigo() throws Exception {
        criarConta(EMAIL);

        pedir(EMAIL)
                .andExpect(status().isAccepted())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(content().string(""));

        assertThat(emailFalso.enviadas()).hasSize(1);
        assertThat(ultimoEmail().texto()).doesNotContainPattern("\\d{6}").contains("/esqueci-senha");
        assertThat(contar("codigo_email")).isZero();
        assertThat(contar("usuario")).isEqualTo(1);
    }

    @Test
    void email_com_maiusculas_e_espacos_cai_na_mesma_pendencia() throws Exception {
        pedir("  Ana@Exemplo.COM ").andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();

        assertThat(jdbc.queryForObject("select email from codigo_email", String.class)).isEqualTo(EMAIL);
        assertThat(ultimoEmail().para()).isEqualTo(EMAIL);

        confirmarComCodigo(" ANA@exemplo.com ", codigo).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select email from usuario", String.class)).isEqualTo(EMAIL);
    }

    // ---- confirmação -------------------------------------------------------------------

    @Test
    void confirmar_com_codigo_certo_responde_201_com_cookie_e_cria_11_categorias() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());

        confirmarComCodigo(EMAIL, codigoDoUltimoEmail())
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("cc_session=")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.nome").value("Ana Teste"))
                .andExpect(jsonPath("$.temSenha").value(true));

        assertThat(contar("usuario")).isEqualTo(1);
        assertThat(contar("categoria")).isEqualTo(11);
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void confirmar_define_a_senha_escolhida_e_ela_entra() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());

        confirmarComCodigo(EMAIL, codigoDoUltimoEmail(), SENHA).andExpect(status().isCreated());

        login(EMAIL, SENHA).andExpect(status().isOk());
        login(EMAIL, "outra-senha-qualquer").andExpect(status().isUnauthorized());
    }

    @Test
    void terceiro_nao_consegue_definir_a_senha_da_conta() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        passarSegundos(61);
        // o terceiro repete o pedido tentando impor a senha dele; o código novo vai só para o e-mail da vítima
        json("/api/auth/cadastro",
                "{\"nome\":\"Ana Teste\",\"email\":\"%s\",\"senha\":\"senha-do-atacante-1\"}".formatted(EMAIL))
                .andExpect(status().isAccepted());
        assertThat(emailFalso.enviadas()).hasSize(2);

        confirmarComCodigo(EMAIL, codigoDoUltimoEmail(), SENHA).andExpect(status().isCreated());

        login(EMAIL, SENHA).andExpect(status().isOk());
        login(EMAIL, "senha-do-atacante-1").andExpect(status().isUnauthorized());
    }

    @Test
    void confirmar_com_token_certo_responde_201_com_cookie() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());

        confirmarComToken(tokenDoUltimoEmail())
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("cc_session=")))
                .andExpect(jsonPath("$.email").value(EMAIL));

        assertThat(contar("usuario")).isEqualTo(1);
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void confirmar_com_token_exige_senha() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String token = tokenDoUltimoEmail();

        json("/api/auth/cadastro/confirmar", "{\"token\":\"%s\"}".formatted(token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a senha."))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        json("/api/auth/cadastro/confirmar", "{\"email\":\"%s\",\"codigo\":\"%s\"}"
                .formatted(EMAIL, codigoDoUltimoEmail()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a senha."));

        assertThat(contar("usuario")).isZero();
        assertThat(contar("codigo_email")).isEqualTo(1);
        // a pendência segue de pé: com a senha, o mesmo link confirma
        confirmarComToken(token).andExpect(status().isCreated());
        login(EMAIL, SENHA).andExpect(status().isOk());
    }

    @Test
    void senha_fora_do_tamanho_na_confirmacao_responde_400_sem_consumir_tentativa() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        String token = tokenDoUltimoEmail();
        String errado = codigo.equals("000000") ? "000001" : "000000";
        String msg = "A senha deve ter entre 8 e 72 caracteres.";

        // curta, longa e acima de 72 bytes (60 caracteres de 2 bytes); código certo, errado e token
        for (String senha : new String[] { "1234567", "a".repeat(73), "é".repeat(60) }) {
            confirmarComCodigo(EMAIL, codigo, senha).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(msg));
            confirmarComCodigo(EMAIL, errado, senha).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(msg));
            confirmarComToken(token, senha).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(msg));
        }

        assertThat(jdbc.queryForObject("select tentativas from codigo_email", Integer.class)).isZero();
        assertThat(contar("usuario")).isZero();
        confirmarComCodigo(EMAIL, codigo, SENHA).andExpect(status().isCreated());
    }

    @Test
    void codigo_vencido_responde_400_generico() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        jdbc.update("update codigo_email set expira_em = ?", Timestamp.from(clock.instant().minusSeconds(60)));

        confirmarComCodigo(EMAIL, codigo)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));

        assertThat(contar("usuario")).isZero();
    }

    @Test
    void quinta_tentativa_errada_apaga_o_codigo_e_sexta_com_o_certo_falha() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String certo = codigoDoUltimoEmail();
        String errado = certo.equals("000000") ? "000001" : "000000";

        for (int i = 1; i <= 4; i++) {
            confirmarComCodigo(EMAIL, errado).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(INVALIDO));
            // o incremento precisa persistir apesar do 400
            assertThat(jdbc.queryForObject("select tentativas from codigo_email", Integer.class)).isEqualTo(i);
        }
        confirmarComCodigo(EMAIL, errado).andExpect(status().isBadRequest());
        assertThat(contar("codigo_email")).isZero();

        confirmarComCodigo(EMAIL, certo)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        assertThat(contar("usuario")).isZero();
    }

    @Test
    void codigo_e_de_uso_unico() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        String token = tokenDoUltimoEmail();

        confirmarComCodigo(EMAIL, codigo).andExpect(status().isCreated());
        confirmarComCodigo(EMAIL, codigo).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        confirmarComToken(token).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        assertThat(contar("usuario")).isEqualTo(1);
    }

    @Test
    void token_desconhecido_responde_400_generico() throws Exception {
        confirmarComToken("token-que-nunca-existiu")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        confirmarComCodigo("ninguem@exemplo.com", "123456")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
    }

    @Test
    void confirmar_sem_codigo_nem_token_responde_400() throws Exception {
        json("/api/auth/cadastro/confirmar", "{\"email\":\"" + EMAIL + "\",\"senha\":\"" + SENHA + "\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        json("/api/auth/cadastro/confirmar", "{}").andExpect(status().isBadRequest());
        json("/api/auth/cadastro/confirmar",
                "{\"email\":\"" + EMAIL + "\",\"codigo\":\"12ab56\",\"senha\":\"" + SENHA + "\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        json("/api/auth/cadastro/confirmar", "{\"token\":\"" + "t".repeat(65) + "\",\"senha\":\"" + SENHA + "\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
    }

    @Test
    void confirmacoes_simultaneas_criam_uma_conta_e_nunca_respondem_500() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        int tentativas = 6;
        ExecutorService pool = Executors.newFixedThreadPool(tentativas);
        CountDownLatch largada = new CountDownLatch(1);
        try {
            List<Future<Integer>> respostas = new ArrayList<>();
            for (int i = 0; i < tentativas; i++) {
                respostas.add(pool.submit(() -> {
                    largada.await();
                    return confirmarComCodigo(EMAIL, codigo).andReturn().getResponse().getStatus();
                }));
            }
            largada.countDown();
            int criadas = 0;
            for (Future<Integer> resposta : respostas) {
                int codigoHttp = resposta.get(60, TimeUnit.SECONDS);
                assertThat(codigoHttp).isIn(201, 400);
                if (codigoHttp == 201) {
                    criadas++;
                }
            }
            assertThat(criadas).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(contar("usuario")).isEqualTo(1);
        assertThat(contar("categoria")).isEqualTo(11);
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void tentativas_erradas_em_paralelo_esgotam_o_codigo_e_o_certo_depois_responde_400() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String certo = codigoDoUltimoEmail();
        String errado = certo.equals("000000") ? "000001" : "000000";
        int tentativas = 12; // bem acima das 5 permitidas
        ExecutorService pool = Executors.newFixedThreadPool(tentativas);
        CountDownLatch largada = new CountDownLatch(1);
        try {
            List<Future<Integer>> respostas = new ArrayList<>();
            for (int i = 0; i < tentativas; i++) {
                respostas.add(pool.submit(() -> {
                    largada.await();
                    return confirmarComCodigo(EMAIL, errado).andReturn().getResponse().getStatus();
                }));
            }
            largada.countDown();
            for (Future<Integer> resposta : respostas) {
                assertThat(resposta.get(60, TimeUnit.SECONDS)).isEqualTo(400);
            }
        } finally {
            pool.shutdownNow();
        }

        // Sem o lock as tentativas se perdem (cada uma lê o mesmo contador) e o código sobreviveria às 12.
        assertThat(contar("codigo_email")).isZero();
        confirmarComCodigo(EMAIL, certo)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        assertThat(contar("usuario")).isZero();
    }

    @Test
    void conta_criada_pelo_google_antes_da_confirmacao_apaga_pendencia_e_responde_400() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        auth.criarUsuario("Ana do Google", EMAIL, null, "sub-google-1");

        confirmarComCodigo(EMAIL, codigo)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        assertThat(contar("codigo_email")).isZero();
        assertThat(contar("usuario")).isEqualTo(1);
        assertThat(jdbc.queryForObject("select nome from usuario", String.class)).isEqualTo("Ana do Google");
    }

    // ---- reenvio e limites -------------------------------------------------------------

    @Test
    void reenvio_com_pendencia_troca_codigo_e_link_e_mantem_nome() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigoAntigo = codigoDoUltimoEmail();
        String tokenAntigo = tokenDoUltimoEmail();
        passarSegundos(61);

        reenviar(EMAIL).andExpect(status().isAccepted()).andExpect(content().string(""));

        assertThat(emailFalso.enviadas()).hasSize(2);
        String codigoNovo = codigoDoUltimoEmail();
        String tokenNovo = tokenDoUltimoEmail();
        assertThat(tokenNovo).isNotEqualTo(tokenAntigo);
        assertThat(jdbc.queryForObject("select nome from codigo_email", String.class)).isEqualTo("Ana Teste");
        assertThat(jdbc.queryForObject("select tentativas from codigo_email", Integer.class)).isZero();

        // o link antigo e (salvo sorteio igual) o código antigo deixam de valer
        confirmarComToken(tokenAntigo).andExpect(status().isBadRequest());
        if (!codigoAntigo.equals(codigoNovo)) {
            confirmarComCodigo(EMAIL, codigoAntigo).andExpect(status().isBadRequest());
        }
        confirmarComCodigo(EMAIL, codigoNovo).andExpect(status().isCreated());
    }

    @Test
    void reenvio_sem_pendencia_responde_202_sem_enviar() throws Exception {
        reenviar(EMAIL).andExpect(status().isAccepted()).andExpect(content().string(""));
        criarConta("conta@exemplo.com");
        reenviar("conta@exemplo.com").andExpect(status().isAccepted());

        assertThat(emailFalso.enviadas()).isEmpty();
        assertThat(contar("envio_email")).isZero();
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void pedido_em_menos_de_60s_responde_202_sem_enviar_e_mantem_o_codigo() throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        passarSegundos(59);

        pedir(EMAIL).andExpect(status().isAccepted());
        reenviar(EMAIL).andExpect(status().isAccepted());

        assertThat(emailFalso.enviadas()).hasSize(1);
        confirmarComCodigo(EMAIL, codigo).andExpect(status().isCreated());
    }

    @Test
    void falha_de_smtp_responde_503_e_nao_consome_o_prazo_de_60s() throws Exception {
        emailFalso.falharNoProximo();

        pedir(EMAIL)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value("Não foi possível enviar o e-mail. Tente de novo."));
        assertThat(contar("envio_email")).isZero();

        pedir(EMAIL).andExpect(status().isAccepted());
        assertThat(emailFalso.enviadas()).hasSize(1);
    }

    @Test
    void quarto_pedido_na_hora_responde_429_com_a_mensagem_exata() throws Exception {
        for (int i = 0; i < 3; i++) {
            pedir(EMAIL).andExpect(status().isAccepted());
            passarSegundos(61);
        }

        pedir(EMAIL)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value(LIMITE));
        assertThat(emailFalso.enviadas()).hasSize(3);
    }

    @Test
    void codigo_e_token_nao_aparecem_no_log(CapturedOutput saida) throws Exception {
        pedir(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();
        String token = tokenDoUltimoEmail();
        confirmarComCodigo(EMAIL, "999999").andExpect(status().isBadRequest());
        confirmarComCodigo(EMAIL, codigo).andExpect(status().isCreated());

        assertThat(saida.getAll()).doesNotContain(codigo).doesNotContain(token).doesNotContain(SENHA);
    }
}
