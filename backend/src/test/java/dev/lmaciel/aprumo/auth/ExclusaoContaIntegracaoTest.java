package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
        excluir(cookie, "{\"senha\":\"  \",\"credencialGoogle\":\"\"}").andExpect(status().isBadRequest());

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
}
