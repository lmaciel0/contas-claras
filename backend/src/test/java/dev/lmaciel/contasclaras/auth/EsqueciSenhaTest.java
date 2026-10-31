package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

/** Recuperação de senha por código de 6 dígitos enviado por e-mail. */
class EsqueciSenhaTest extends IntegracaoTest {

    private static final String EMAIL = "ana@exemplo.com";
    private static final String NOVA_SENHA = "senha-nova-123";
    private static final String INVALIDO = "Código inválido ou expirado.";
    private static final Pattern CODIGO = Pattern.compile("\\b(\\d{6})\\b");

    @Autowired
    JdbcTemplate jdbc;

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

    private ResultActions esqueci(String email) throws Exception {
        return json("/api/auth/esqueci-senha", "{\"email\":\"%s\"}".formatted(email));
    }

    private ResultActions redefinir(String email, String codigo, String senha) throws Exception {
        return json("/api/auth/redefinir-senha",
                "{\"email\":\"%s\",\"codigo\":\"%s\",\"senha\":\"%s\"}".formatted(email, codigo, senha));
    }

    private ResultActions login(String email, String senha) throws Exception {
        return json("/api/auth/login", "{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha));
    }

    private String codigoDoUltimoEmail() {
        List<MensagemEmail> enviadas = emailFalso.enviadas();
        assertThat(enviadas).isNotEmpty();
        Matcher m = CODIGO.matcher(enviadas.get(enviadas.size() - 1).texto());
        assertThat(m.find()).as("o e-mail traz um código").isTrue();
        return m.group(1);
    }

    private long contar(String tabela) {
        return jdbc.queryForObject("select count(*) from " + tabela, Long.class);
    }

    private static String valorDoCookie(String setCookie) {
        return setCookie.substring("cc_session=".length(), setCookie.indexOf(';'));
    }

    // ---- pedido ------------------------------------------------------------------------

    @Test
    void email_com_conta_responde_202_e_envia_codigo() throws Exception {
        cadastrarEEntrar(EMAIL);

        esqueci(" Ana@Exemplo.com ").andExpect(status().isAccepted()).andExpect(content().string(""))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        assertThat(emailFalso.enviadas()).hasSize(1);
        assertThat(emailFalso.enviadas().get(0).para()).isEqualTo(EMAIL);
        assertThat(codigoDoUltimoEmail()).matches("\\d{6}");
        var linha = jdbc.queryForMap("select * from codigo_email");
        assertThat(linha.get("tipo")).isEqualTo("SENHA");
        assertThat(linha.get("email")).isEqualTo(EMAIL);
        assertThat(linha.get("nome")).isNull();
        assertThat(linha.get("senha_hash")).isNull();
        assertThat(linha.get("token_hash")).isNull();
        assertThat(linha.toString()).doesNotContain(codigoDoUltimoEmail());
    }

    @Test
    void email_sem_conta_responde_202_igual_e_envia_aviso_sem_codigo() throws Exception {
        esqueci(EMAIL).andExpect(status().isAccepted()).andExpect(content().string(""))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        assertThat(emailFalso.enviadas()).hasSize(1);
        assertThat(emailFalso.enviadas().get(0).texto()).doesNotContainPattern("\\d{6}").contains("/cadastro");
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void pedido_em_menos_de_60s_responde_202_sem_enviar() throws Exception {
        cadastrarEEntrar(EMAIL);
        esqueci(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();

        esqueci(EMAIL).andExpect(status().isAccepted());

        assertThat(emailFalso.enviadas()).hasSize(1);
        // o código anterior segue valendo
        redefinir(EMAIL, codigo, NOVA_SENHA).andExpect(status().isOk());
    }

    @Test
    void falha_de_smtp_responde_503() throws Exception {
        cadastrarEEntrar(EMAIL);
        emailFalso.falharNoProximo();

        esqueci(EMAIL)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value("Não foi possível enviar o e-mail. Tente de novo."));

        assertThat(contar("envio_email")).isZero();
        esqueci(EMAIL).andExpect(status().isAccepted());
        assertThat(emailFalso.enviadas()).hasSize(1);
    }

    // ---- redefinição -------------------------------------------------------------------

    @Test
    void codigo_certo_troca_a_senha_entra_e_derruba_sessoes_antigas() throws Exception {
        Cookie antigo = cadastrarEEntrar(EMAIL);
        esqueci(EMAIL).andExpect(status().isAccepted());

        String setCookie = redefinir(EMAIL, codigoDoUltimoEmail(), NOVA_SENHA)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.temSenha").value(true))
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);

        mvc.perform(get("/api/auth/me").cookie(antigo))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
        mvc.perform(get("/api/auth/me").cookie(new Cookie("cc_session", valorDoCookie(setCookie))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL));
        assertThat(contar("codigo_email")).isZero();
    }

    @Test
    void senha_antiga_para_de_funcionar_e_a_nova_entra() throws Exception {
        cadastrarEEntrar(EMAIL);
        esqueci(EMAIL).andExpect(status().isAccepted());
        redefinir(EMAIL, codigoDoUltimoEmail(), NOVA_SENHA).andExpect(status().isOk());

        login(EMAIL, SENHA_PADRAO_TESTE).andExpect(status().isUnauthorized());
        login(EMAIL, NOVA_SENHA).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select senha_hash from usuario", String.class)).startsWith("$2")
                .doesNotContain(NOVA_SENHA);
    }

    @Test
    void conta_so_com_google_pode_definir_senha() throws Exception {
        auth.criarUsuario("Ana Google", EMAIL, null, "sub-google-1");
        esqueci(EMAIL).andExpect(status().isAccepted());

        redefinir(EMAIL, codigoDoUltimoEmail(), NOVA_SENHA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(true));

        login(EMAIL, NOVA_SENHA).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select google_sub from usuario", String.class)).isEqualTo("sub-google-1");
    }

    @Test
    void senha_fora_do_tamanho_responde_400_sem_consumir_tentativa() throws Exception {
        cadastrarEEntrar(EMAIL);
        esqueci(EMAIL).andExpect(status().isAccepted());
        String codigo = codigoDoUltimoEmail();

        redefinir(EMAIL, codigo, "curta").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha deve ter entre 8 e 72 caracteres."));
        redefinir(EMAIL, codigo, "a".repeat(73)).andExpect(status().isBadRequest());
        // 60 caracteres, mas 120 bytes: o BCrypt não aceita
        redefinir(EMAIL, codigo, "é".repeat(60)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha deve ter entre 8 e 72 caracteres."));

        assertThat(jdbc.queryForObject("select tentativas from codigo_email", Integer.class)).isZero();
        redefinir(EMAIL, codigo, NOVA_SENHA).andExpect(status().isOk());
    }

    @Test
    void quinta_tentativa_errada_apaga_o_codigo() throws Exception {
        cadastrarEEntrar(EMAIL);
        esqueci(EMAIL).andExpect(status().isAccepted());
        String certo = codigoDoUltimoEmail();
        String errado = certo.equals("000000") ? "000001" : "000000";

        for (int i = 1; i <= 4; i++) {
            redefinir(EMAIL, errado, NOVA_SENHA).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(INVALIDO));
            assertThat(jdbc.queryForObject("select tentativas from codigo_email", Integer.class)).isEqualTo(i);
        }
        redefinir(EMAIL, errado, NOVA_SENHA).andExpect(status().isBadRequest());
        assertThat(contar("codigo_email")).isZero();

        redefinir(EMAIL, certo, NOVA_SENHA).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
        login(EMAIL, SENHA_PADRAO_TESTE).andExpect(status().isOk());
    }

    @Test
    void codigo_de_cadastro_nao_serve_para_redefinir() throws Exception {
        json("/api/auth/cadastro", "{\"nome\":\"Ana\",\"email\":\"%s\",\"senha\":\"senha-segura-1\"}".formatted(EMAIL))
                .andExpect(status().isAccepted());
        String codigoDoCadastro = codigoDoUltimoEmail();

        redefinir(EMAIL, codigoDoCadastro, NOVA_SENHA).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));

        assertThat(contar("usuario")).isZero();
        assertThat(contar("codigo_email")).isEqualTo(1);
    }

    @Test
    void email_sem_conta_responde_400_generico_ao_redefinir() throws Exception {
        redefinir("ninguem@exemplo.com", "123456", NOVA_SENHA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(INVALIDO));
    }
}
