package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.aprumo.IntegracaoTest;
import dev.lmaciel.aprumo.auth.GoogleTokenVerifier.IdentidadeGoogle;
import jakarta.servlet.http.Cookie;

class ExclusaoContaIntegracaoTest extends IntegracaoTest {

    private static final String EMAIL_A = "a@exemplo.com";
    private static final String EMAIL_B = "b@exemplo.com";
    private static final String TOKEN_A = "token-google-a";
    private static final String TOKEN_B = "token-google-b";

    @MockitoBean
    GoogleTokenVerifier verificador;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PasswordEncoder encoder;

    @BeforeEach
    void limparUsuarios() {
        jdbc.update("delete from usuario");
    }

    // ---- helpers -----------------------------------------------------------------------

    private long idDe(String email) {
        return jdbc.queryForObject("select id from usuario where email = ?", Long.class, email);
    }

    /** Dá ao usuário uma linha de cada módulo, mais um e-mail pendente de confirmação. Devolve o id dele. */
    private long popular(String email) {
        long id = idDe(email);
        String categoria = jdbc.queryForObject(
                "select nome from categoria where usuario_id = ? order by id limit 1", String.class, id);
        long item = criarItem(email, categoria, "Item de " + email);
        criarLancamento(item, 2026, 10, "100.00", "PAGO");
        jdbc.update("insert into tarefa (usuario_id, titulo) values (?, 'Tarefa')", id);
        jdbc.update("insert into nota (usuario_id, titulo, conteudo) values (?, 'Nota', '{}'::jsonb)", id);
        jdbc.update("insert into projeto (usuario_id, titulo) values (?, 'Projeto')", id);
        jdbc.update("""
                insert into codigo_email (tipo, email, codigo_hmac, expira_em)
                values ('SENHA', ?, 'hmac', now() + interval '1 hour')""", email);
        return id;
    }

    private long contar(String tabela, long usuarioId) {
        String sql = switch (tabela) {
            case "usuario" -> "select count(*) from usuario where id = ?";
            case "item" -> "select count(*) from item i join categoria c on c.id = i.categoria_id where c.usuario_id = ?";
            case "lancamento" -> """
                    select count(*) from lancamento l join item i on i.id = l.item_id
                    join categoria c on c.id = i.categoria_id where c.usuario_id = ?""";
            default -> "select count(*) from " + tabela + " where usuario_id = ?";
        };
        return jdbc.queryForObject(sql, Long.class, usuarioId);
    }

    private long contarCodigos(String email) {
        return jdbc.queryForObject("select count(*) from codigo_email where email = ?", Long.class, email);
    }

    private ResultActions excluir(Cookie cookie, String corpo) throws Exception {
        var pedido = delete("/api/auth/conta").contentType(MediaType.APPLICATION_JSON).content(corpo);
        return cookie == null ? mvc.perform(pedido) : mvc.perform(pedido.cookie(cookie));
    }

    private static String comSenha(String senha) {
        return "{\"senha\":\"%s\"}".formatted(senha);
    }

    private static String comGoogle(String credencial) {
        return "{\"credencialGoogle\":\"%s\"}".formatted(credencial);
    }

    private void tokenGoogle(String token, String sub, String email) {
        when(verificador.verificar(token))
                .thenReturn(Optional.of(new IdentidadeGoogle(sub, email, true, "Pessoa Google")));
    }

    /** Entra pelo Google (cria a conta, sem senha) e devolve o cookie da sessão. */
    private Cookie entrarComGoogle(String token) throws Exception {
        MvcResult resultado = mvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"credential\":\"%s\"}".formatted(token)))
                .andExpect(status().isOk())
                .andReturn();
        String setCookie = resultado.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        return new Cookie("cc_session", setCookie.substring("cc_session=".length(), setCookie.indexOf(';')));
    }

    // ---- testes ------------------------------------------------------------------------

    @Test
    void excluiContaComSenhaEApagaTodosOsDadosDoUsuario() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        long a = popular(EMAIL_A);
        assertThat(contar("categoria", a)).isPositive();
        assertThat(contar("lancamento", a)).isEqualTo(1);

        excluir(cookie, comSenha(SENHA_PADRAO_TESTE))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("cc_session="),
                        containsString("Max-Age=0"))));

        for (String tabela : new String[] { "usuario", "categoria", "item", "lancamento", "tarefa", "nota",
                "projeto" }) {
            assertThat(contar(tabela, a)).as(tabela).isZero();
        }
        assertThat(contarCodigos(EMAIL_A)).isZero();
    }

    @Test
    void naoMexeNosDadosDeOutroUsuario() throws Exception {
        Cookie cookieA = cadastrarEEntrar(EMAIL_A);
        cadastrarEEntrar(EMAIL_B);
        long a = popular(EMAIL_A);
        long b = popular(EMAIL_B);
        String[] tabelas = { "usuario", "categoria", "item", "lancamento", "tarefa", "nota", "projeto" };
        long[] antes = new long[tabelas.length];
        for (int i = 0; i < tabelas.length; i++) {
            antes[i] = contar(tabelas[i], b);
            assertThat(antes[i]).as(tabelas[i]).isPositive();
        }

        excluir(cookieA, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isNoContent());

        assertThat(contar("usuario", a)).isZero();
        for (int i = 0; i < tabelas.length; i++) {
            assertThat(contar(tabelas[i], b)).as(tabelas[i]).isEqualTo(antes[i]);
        }
        assertThat(contarCodigos(EMAIL_B)).isEqualTo(1);
    }

    @Test
    void senhaErradaNaoApagaNada() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        long a = popular(EMAIL_A);

        excluir(cookie, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());

        assertThat(contar("usuario", a)).isEqualTo(1);
        assertThat(contar("lancamento", a)).isEqualTo(1);
        assertThat(contarCodigos(EMAIL_A)).isEqualTo(1);
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isOk());
    }

    @Test
    void semSenhaNemGoogleRetorna400() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);

        excluir(cookie, "{}").andExpect(status().isBadRequest());
        // Espaços valem como senha (SEC7), mas não como credencial do Google.
        excluir(cookie, "{\"senha\":\"\",\"credencialGoogle\":\"  \"}").andExpect(status().isBadRequest());

        assertThat(contar("usuario", idDe(EMAIL_A))).isEqualTo(1);
    }

    @Test
    void senhaEGoogleJuntosRetorna400() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);

        excluir(cookie, "{\"senha\":\"%s\",\"credencialGoogle\":\"%s\"}".formatted(SENHA_PADRAO_TESTE, TOKEN_A))
                .andExpect(status().isBadRequest());

        assertThat(contar("usuario", idDe(EMAIL_A))).isEqualTo(1);
    }

    @Test
    void contaSoGoogleExcluiComCredencialDoMesmoUsuario() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie cookie = entrarComGoogle(TOKEN_A);
        long a = popular(EMAIL_A);

        excluir(cookie, comGoogle(TOKEN_A)).andExpect(status().isNoContent());

        assertThat(contar("usuario", a)).isZero();
        assertThat(contar("lancamento", a)).isZero();
    }

    @Test
    void credencialGoogleDeOutroUsuarioRetorna401() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        tokenGoogle(TOKEN_B, "sub-b", EMAIL_B);
        Cookie cookieA = entrarComGoogle(TOKEN_A);
        entrarComGoogle(TOKEN_B);
        long a = idDe(EMAIL_A);
        long b = idDe(EMAIL_B);

        excluir(cookieA, comGoogle(TOKEN_B)).andExpect(status().isUnauthorized());

        assertThat(contar("usuario", a)).isEqualTo(1);
        assertThat(contar("usuario", b)).isEqualTo(1);
    }

    @Test
    void cookieAntigoEntrarDepoisRetorna401() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);

        excluir(cookie, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(EMAIL_A, SENHA_PADRAO_TESTE)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void segundaExclusaoRetorna401() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);

        excluir(cookie, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isNoContent());
        excluir(cookie, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isUnauthorized());
    }

    @Test
    void semSessaoRetorna401() throws Exception {
        cadastrarEEntrar(EMAIL_A);

        excluir(null, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isUnauthorized());

        assertThat(contar("usuario", idDe(EMAIL_A))).isEqualTo(1);
    }

    // ---- PUT /senha: conta só Google (SEC1) ---------------------------------------------

    private ResultActions definirSenha(Cookie cookie, String corpo) throws Exception {
        return mvc.perform(put("/api/auth/senha").contentType(MediaType.APPLICATION_JSON).content(corpo)
                .cookie(cookie));
    }

    private static String corpoDefinirSenha(String senhaAtual, String credencialGoogle, String senha) {
        StringBuilder json = new StringBuilder("{");
        if (senhaAtual != null) {
            json.append("\"senhaAtual\":\"%s\",".formatted(senhaAtual));
        }
        if (credencialGoogle != null) {
            json.append("\"credencialGoogle\":\"%s\",".formatted(credencialGoogle));
        }
        return json.append("\"senha\":\"%s\"}".formatted(senha)).toString();
    }

    private String senhaHashDe(long id) {
        return jdbc.queryForObject("select senha_hash from usuario where id = ?", String.class, id);
    }

    @Test
    void contaSoGoogleDefinirSenhaSemGoogleRetorna401ENadaMuda() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie cookie = entrarComGoogle(TOKEN_A);
        long a = idDe(EMAIL_A);

        definirSenha(cookie, corpoDefinirSenha(null, null, "senha-do-atacante-1"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        definirSenha(cookie, corpoDefinirSenha("qualquer-coisa-1", null, "senha-do-atacante-1"))
                .andExpect(status().isUnauthorized());

        assertThat(senhaHashDe(a)).isNull();
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(false));
    }

    @Test
    void contaSoGoogleDefinirSenhaComGoogleDoMesmoUsuarioFunciona() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie antigo = entrarComGoogle(TOKEN_A);

        MvcResult resposta = definirSenha(antigo, corpoDefinirSenha(null, TOKEN_A, "primeira-senha-1"))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("cc_session=")))
                .andReturn();
        String setCookie = resposta.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        Cookie novo = new Cookie("cc_session", setCookie.substring("cc_session=".length(), setCookie.indexOf(';')));

        mvc.perform(get("/api/auth/me").cookie(antigo)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").cookie(novo)).andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(true));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"primeira-senha-1\"}".formatted(EMAIL_A)))
                .andExpect(status().isOk());
    }

    @Test
    void contaSoGoogleDefinirSenhaComGoogleDeOutroUsuarioRetorna401() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        tokenGoogle(TOKEN_B, "sub-b", EMAIL_B);
        Cookie cookieA = entrarComGoogle(TOKEN_A);
        entrarComGoogle(TOKEN_B);

        definirSenha(cookieA, corpoDefinirSenha(null, TOKEN_B, "senha-do-atacante-1"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        when(verificador.verificar("token-invalido")).thenReturn(Optional.empty());
        definirSenha(cookieA, corpoDefinirSenha(null, "token-invalido", "senha-do-atacante-1"))
                .andExpect(status().isUnauthorized());

        assertThat(senhaHashDe(idDe(EMAIL_A))).isNull();
    }

    @Test
    void contaSoGoogleNaoApagaComSenhaCriadaSemPassarPeloGoogle() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie cookie = entrarComGoogle(TOKEN_A);
        long a = idDe(EMAIL_A);

        definirSenha(cookie, corpoDefinirSenha(null, null, "senha-do-atacante-1"))
                .andExpect(status().isUnauthorized());
        excluir(cookie, comSenha("senha-do-atacante-1")).andExpect(status().isUnauthorized());

        assertThat(contar("usuario", a)).isEqualTo(1);
    }

    @Test
    void contaSoGoogleEnviandoSenhaNoDeleteRetorna401SemApagar() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie cookie = entrarComGoogle(TOKEN_A);
        long a = popular(EMAIL_A);

        excluir(cookie, comSenha("qualquer-senha-1")).andExpect(status().isUnauthorized());

        assertThat(contar("usuario", a)).isEqualTo(1);
        assertThat(contar("lancamento", a)).isEqualTo(1);
        assertThat(contarCodigos(EMAIL_A)).isEqualTo(1);
    }

    @Test
    void contaComSenhaIgnoraCredencialGoogleEExigeSenhaAtual() throws Exception {
        tokenGoogle(TOKEN_A, "sub-a", EMAIL_A);
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        jdbc.update("update usuario set google_sub = 'sub-a' where email = ?", EMAIL_A);

        definirSenha(cookie, corpoDefinirSenha(null, TOKEN_A, "outra-senha-123"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(EMAIL_A, SENHA_PADRAO_TESTE)))
                .andExpect(status().isOk());
    }

    // ---- limite de tentativas da reautenticação (SEC2) ------------------------------------

    private void loginDeveFuncionar(String email) throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, SENHA_PADRAO_TESTE)))
                .andExpect(status().isOk());
    }

    @Test
    void excluirComSenhaErradaBloqueiaNaSextaTentativaSemTravarOLogin() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        long a = idDe(EMAIL_A);

        for (int i = 0; i < LimiteTentativasLogin.MAX_TENTATIVAS; i++) {
            excluir(cookie, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());
        }
        // Mesmo a senha certa fica bloqueada na janela.
        excluir(cookie, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isTooManyRequests());
        excluir(cookie, comSenha("senha-errada-123")).andExpect(status().isTooManyRequests());

        assertThat(contar("usuario", a)).isEqualTo(1);
        loginDeveFuncionar(EMAIL_A);
    }

    @Test
    void senhaAtualErradaDoPutSenhaDividePorUsuarioOMesmoLimiteDaExclusao() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        long a = idDe(EMAIL_A);

        for (int i = 0; i < LimiteTentativasLogin.MAX_TENTATIVAS - 1; i++) {
            definirSenha(cookie, corpoDefinirSenha("senha-errada-123", null, "nova-senha-123"))
                    .andExpect(status().isBadRequest());
        }
        excluir(cookie, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());
        definirSenha(cookie, corpoDefinirSenha(SENHA_PADRAO_TESTE, null, "nova-senha-123"))
                .andExpect(status().isTooManyRequests());
        excluir(cookie, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isTooManyRequests());

        assertThat(contar("usuario", a)).isEqualTo(1);
        loginDeveFuncionar(EMAIL_A);
    }

    @Test
    void limiteDeUmUsuarioNaoAfetaOutro() throws Exception {
        Cookie cookieA = cadastrarEEntrar(EMAIL_A);
        Cookie cookieB = cadastrarEEntrar(EMAIL_B);

        for (int i = 0; i < LimiteTentativasLogin.MAX_TENTATIVAS; i++) {
            excluir(cookieA, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());
        }
        excluir(cookieA, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isTooManyRequests());

        excluir(cookieB, comSenha(SENHA_PADRAO_TESTE)).andExpect(status().isNoContent());
    }

    @Test
    void sucessoZeraOContadorDaReautenticacao() throws Exception {
        Cookie antigo = cadastrarEEntrar(EMAIL_A);
        for (int i = 0; i < LimiteTentativasLogin.MAX_TENTATIVAS - 1; i++) {
            excluir(antigo, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());
        }
        MvcResult resposta = definirSenha(antigo, corpoDefinirSenha(SENHA_PADRAO_TESTE, null, "nova-senha-123"))
                .andExpect(status().isNoContent()).andReturn();
        String setCookie = resposta.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        Cookie novo = new Cookie("cc_session", setCookie.substring("cc_session=".length(), setCookie.indexOf(';')));

        for (int i = 0; i < LimiteTentativasLogin.MAX_TENTATIVAS; i++) {
            excluir(novo, comSenha("senha-errada-123")).andExpect(status().isUnauthorized());
        }
    }

    // ---- senha só com espaços (SEC7) ----------------------------------------------------

    @Test
    void usuarioComSenhaDeOitoEspacosExcluiComNoContent() throws Exception {
        Cookie cookie = cadastrarEEntrar(EMAIL_A);
        long a = idDe(EMAIL_A);
        jdbc.update("update usuario set senha_hash = ? where id = ?", encoder.encode("        "), a);

        excluir(cookie, comSenha("        ")).andExpect(status().isNoContent());

        assertThat(contar("usuario", a)).isZero();
    }
}
