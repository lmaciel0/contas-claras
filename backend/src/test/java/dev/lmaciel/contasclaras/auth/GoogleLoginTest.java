package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import dev.lmaciel.contasclaras.auth.GoogleTokenVerifier.IdentidadeGoogle;
import jakarta.servlet.http.Cookie;

class GoogleLoginTest extends IntegracaoTest {

    private static final String LOGIN_INVALIDO = "Login Google inválido.";
    private static final String NAO_PERMITIDO = "Não foi possível criar a conta com este e-mail.";
    private static final String SENHA = "senha-segura-1";
    private static final String TOKEN = "token-google-falso";

    @MockitoBean
    GoogleTokenVerifier verificador;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limparUsuarios() {
        jdbc.update("delete from usuario");
    }

    // ---- helpers -----------------------------------------------------------------------

    private void tokenValido(String sub, String email, boolean emailVerificado) {
        when(verificador.verificar(TOKEN))
                .thenReturn(Optional.of(new IdentidadeGoogle(sub, email, emailVerificado, "Pessoa Google")));
    }

    private ResultActions google(String credential) throws Exception {
        return mvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"credential\":\"%s\"}".formatted(credential)));
    }

    private ResultActions loginPorSenha(String email, String senha) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha)));
    }

    private static Cookie cookieDe(MvcResult resultado) {
        String setCookie = resultado.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith("cc_session=");
        return new Cookie("cc_session", setCookie.substring("cc_session=".length(), setCookie.indexOf(';')));
    }

    private Cookie cadastrarPorSenha(String email) throws Exception {
        return cookieDe(mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Dono Teste\",\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, SENHA)))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private long contarUsuarios() {
        return jdbc.queryForObject("select count(*) from usuario", Long.class);
    }

    // ---- token ruim ---------------------------------------------------------------------

    @Test
    void google_token_invalido_retorna_401() throws Exception {
        when(verificador.verificar(anyString())).thenReturn(Optional.empty());

        google("lixo")
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value(LOGIN_INVALIDO));

        assertThat(contarUsuarios()).isZero();
    }

    @Test
    void google_email_nao_verificado_retorna_401() throws Exception {
        tokenValido("sub-1", "dono@exemplo.com", false);

        google(TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value(LOGIN_INVALIDO));

        assertThat(contarUsuarios()).isZero();
    }

    @Test
    void google_sem_credential_retorna_400_sem_chamar_o_verificador() throws Exception {
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a credencial do Google."));
        google("   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a credencial do Google."));

        verify(verificador, never()).verificar(anyString());
    }

    // ---- primeiro login ------------------------------------------------------------------

    @Test
    void google_primeiro_login_com_email_liberado_cria_usuario_sem_senha() throws Exception {
        tokenValido("sub-1", "dono@exemplo.com", true);

        google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("cc_session="),
                        containsString("HttpOnly"),
                        containsString("Secure"),
                        containsString("SameSite=Strict"),
                        containsString("Max-Age=2592000"))))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Pessoa Google"))
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"))
                .andExpect(jsonPath("$.temSenha").value(false))
                .andExpect(content().string(not(containsString("sub-1"))));

        assertThat(jdbc.queryForObject("select google_sub from usuario", String.class)).isEqualTo("sub-1");
        assertThat(jdbc.queryForObject("select senha_hash from usuario", String.class)).isNull();
        assertThat(jdbc.queryForObject("select count(*) from categoria", Long.class)).isEqualTo(11);
    }

    @Test
    void google_cookie_do_primeiro_login_abre_a_sessao() throws Exception {
        tokenValido("sub-1", "dono@exemplo.com", true);

        Cookie cookie = cookieDe(google(TOKEN).andExpect(status().isOk()).andReturn());

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"))
                .andExpect(jsonPath("$.temSenha").value(false));
    }

    @Test
    void google_normaliza_o_email_do_token() throws Exception {
        tokenValido("sub-1", "  Dono@Exemplo.COM ", true);

        google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"));

        assertThat(jdbc.queryForObject("select email from usuario", String.class)).isEqualTo("dono@exemplo.com");
    }

    @Test
    void google_sem_nome_no_token_usa_o_email_como_nome() throws Exception {
        when(verificador.verificar(TOKEN))
                .thenReturn(Optional.of(new IdentidadeGoogle("sub-1", "dono@exemplo.com", true, null)));

        google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("dono@exemplo.com"));
    }

    @Test
    void google_nome_maior_que_120_e_cortado_sem_falhar() throws Exception {
        when(verificador.verificar(TOKEN)).thenReturn(
                Optional.of(new IdentidadeGoogle("sub-1", "dono@exemplo.com", true, "n".repeat(300))));

        google(TOKEN).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("select nome from usuario", String.class)).hasSize(120);
    }

    @Test
    void google_email_nao_liberado_retorna_403() throws Exception {
        tokenValido("sub-9", "intruso@exemplo.com", true);

        google(TOKEN)
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value(NAO_PERMITIDO));

        assertThat(contarUsuarios()).isZero();
    }

    // ---- vínculo com conta existente -----------------------------------------------------

    @Test
    void google_vincula_conta_com_senha_e_apaga_senha() throws Exception {
        Cookie cookieAntigo = cadastrarPorSenha("dono@exemplo.com");
        tokenValido("sub-1", "Dono@Exemplo.com", true);

        MvcResult resposta = google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"))
                .andExpect(jsonPath("$.temSenha").value(false))
                .andReturn();
        Cookie cookieNovo = cookieDe(resposta);

        assertThat(contarUsuarios()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select google_sub from usuario", String.class)).isEqualTo("sub-1");
        assertThat(jdbc.queryForObject("select senha_hash from usuario", String.class)).isNull();
        assertThat(jdbc.queryForObject("select count(*) from categoria", Long.class)).isEqualTo(11);
        loginPorSenha("dono@exemplo.com", SENHA)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
        // o vínculo derruba as sessões abertas antes dele; só o cookie novo vale
        mvc.perform(get("/api/auth/me").cookie(cookieAntigo))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
        mvc.perform(get("/api/auth/me").cookie(cookieNovo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(false));
    }

    @Test
    void google_nao_sobrescreve_google_sub_de_conta_ja_vinculada_a_outro_google() throws Exception {
        // conta com senha e já vinculada ao Google "sub-A" (ex.: depois definiu uma senha)
        jdbc.update("insert into usuario (nome, email, senha_hash, google_sub) values (?, ?, ?, ?)",
                "Dono Teste", "dono@exemplo.com", new BCryptPasswordEncoder().encode(SENHA), "sub-A");
        Cookie cookie = cookieDe(loginPorSenha("dono@exemplo.com", SENHA).andExpect(status().isOk()).andReturn());
        String hashAntes = jdbc.queryForObject("select senha_hash from usuario", String.class);
        int versaoAntes = jdbc.queryForObject("select sessao_versao from usuario", Integer.class);

        // outra conta Google (sub-B) com o mesmo e-mail, por exemplo um e-mail corporativo reaproveitado
        tokenValido("sub-B", "dono@exemplo.com", true);
        google(TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value(LOGIN_INVALIDO));

        assertThat(jdbc.queryForObject("select google_sub from usuario", String.class)).isEqualTo("sub-A");
        assertThat(jdbc.queryForObject("select senha_hash from usuario", String.class)).isEqualTo(hashAntes);
        assertThat(jdbc.queryForObject("select sessao_versao from usuario", Integer.class)).isEqualTo(versaoAntes);
        assertThat(contarUsuarios()).isEqualTo(1);
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isOk());
        loginPorSenha("dono@exemplo.com", SENHA).andExpect(status().isOk());
    }

    @Test
    void google_segundo_login_usa_google_sub() throws Exception {
        tokenValido("sub-1", "dono@exemplo.com", true);
        Cookie primeiro = cookieDe(google(TOKEN).andExpect(status().isOk()).andReturn());
        long id = jdbc.queryForObject("select id from usuario", Long.class);

        // o Google passou a informar outro e-mail para o mesmo sub: entra na mesma conta
        tokenValido("sub-1", "outra@exemplo.com", true);
        google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"));

        assertThat(contarUsuarios()).isEqualTo(1);
        // login normal não mexe nas outras sessões
        mvc.perform(get("/api/auth/me").cookie(primeiro)).andExpect(status().isOk());
    }

    @Test
    void google_sub_conhecido_entra_mesmo_com_email_fora_da_lista() throws Exception {
        tokenValido("sub-1", "dono@exemplo.com", true);
        google(TOKEN).andExpect(status().isOk());

        tokenValido("sub-1", "mudou@exemplo.com", true);
        google(TOKEN)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"));
    }
}
