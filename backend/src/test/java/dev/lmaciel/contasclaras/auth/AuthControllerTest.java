package dev.lmaciel.contasclaras.auth;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class AuthControllerTest extends IntegracaoTest {

    private static final String SENHA = "senha-segura-1";
    private static final Instant AGORA = Instant.parse("2026-10-29T15:00:00Z");

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limparUsuarios() {
        jdbc.update("delete from usuario");
    }

    // ---- helpers -----------------------------------------------------------------------

    private ResultActions cadastrar(String nome, String email) throws Exception {
        return mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"%s","email":"%s"}""".formatted(nome, email)));
    }

    private ResultActions login(String email, String senha) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","senha":"%s"}""".formatted(email, senha)));
    }

    private static Cookie cookieDe(MvcResult resultado) {
        String setCookie = resultado.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith("cc_session=");
        String valor = setCookie.substring("cc_session=".length(), setCookie.indexOf(';'));
        return new Cookie("cc_session", valor);
    }

    private Cookie cookieDeUsuarioNovo(String email) throws Exception {
        return cadastrarEEntrar(email);
    }

    /** Monta o JWT como o contrato define (HS256, sub = id), sem depender do TokenService. */
    private static String jwt(String segredo, long usuarioId, Instant expiraEm) {
        return jwt(segredo, String.valueOf(usuarioId), 0, expiraEm);
    }

    private static String jwt(String segredo, String sub, Integer versao, Instant expiraEm) {
        var chave = new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        var encoder = NimbusJwtEncoder.withSecretKey(chave).build();
        var claims = JwtClaimsSet.builder()
                .subject(sub)
                .issuedAt(expiraEm.minusSeconds(7200))
                .expiresAt(expiraEm);
        if (versao != null) {
            claims.claim("ver", versao);
        }
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
    }

    private void inserirUsuarioComSenha(String email, String senha) {
        jdbc.update("insert into usuario (nome, email, senha_hash) values ('Com Senha', ?, ?)",
                email, new BCryptPasswordEncoder().encode(senha));
    }

    private long inserirUsuarioSemSenha(String email) {
        return jdbc.queryForObject(
                "insert into usuario (nome, email) values ('Sem Senha', ?) returning id", Long.class, email);
    }

    // ---- cadastro ----------------------------------------------------------------------

    @Test
    void cadastro_com_email_invalido_retorna_400() throws Exception {
        cadastrar("Dono Teste", "isto-nao-e-email")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe um e-mail válido."));
    }

    @Test
    void cadastro_sem_nome_retorna_400() throws Exception {
        cadastrar("   ", "dono@exemplo.com")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome."));
    }

    @Test
    void cadastro_com_nome_maior_que_120_retorna_400() throws Exception {
        cadastrar("n".repeat(121), "dono@exemplo.com")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O nome deve ter até 120 caracteres."));
    }

    @Test
    void cadastro_so_aceita_application_json() throws Exception {
        mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("nome", "Dono Teste").param("email", "dono@exemplo.com"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    // ---- login -------------------------------------------------------------------------

    @Test
    void login_com_senha_certa_retorna_200_e_cookie() throws Exception {
        cadastrarEEntrar("dono@exemplo.com");

        login(" Dono@Exemplo.com ", SENHA)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("cc_session="),
                        containsString("HttpOnly"),
                        containsString("SameSite=Strict"))))
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"))
                .andExpect(jsonPath("$.temSenha").value(true));
    }

    @Test
    void login_com_senha_errada_retorna_401() throws Exception {
        inserirUsuarioComSenha("errada@exemplo.com", SENHA);

        login("errada@exemplo.com", "senha-errada-9")
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
    }

    @Test
    void login_com_email_inexistente_retorna_a_mesma_resposta() throws Exception {
        login("naoexiste@exemplo.com", SENHA)
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
    }

    @Test
    void login_de_usuario_sem_senha_retorna_a_mesma_resposta() throws Exception {
        inserirUsuarioSemSenha("semsenha@exemplo.com");

        login("semsenha@exemplo.com", SENHA)
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
    }

    @Test
    void login_com_senha_gigante_retorna_401_e_nao_500() throws Exception {
        inserirUsuarioComSenha("gigante@exemplo.com", SENHA);

        login("gigante@exemplo.com", "é".repeat(200))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
    }

    @Test
    void login_com_email_gigante_retorna_400_sem_entrar_no_contador() throws Exception {
        login("e".repeat(300) + "@exemplo.com", SENHA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos."));
    }

    @Test
    void login_funciona_mesmo_com_cookie_de_sessao_vencida() throws Exception {
        inserirUsuarioComSenha("vencida@exemplo.com", SENHA);
        long id = inserirUsuarioSemSenha("qualquer@exemplo.com");
        Cookie vencido = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, id, AGORA.minusSeconds(3600)));

        mvc.perform(post("/api/auth/login").cookie(vencido).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"vencida@exemplo.com\",\"senha\":\"" + SENHA + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void login_sem_senha_no_corpo_retorna_400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"dono@exemplo.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a senha."));
    }

    @Test
    void login_bloqueia_na_6a_tentativa_mesmo_com_senha_certa() throws Exception {
        inserirUsuarioComSenha("bloqueio@exemplo.com", SENHA);

        for (int i = 0; i < 5; i++) {
            login("bloqueio@exemplo.com", "senha-errada-" + i)
                    .andExpect(status().isUnauthorized());
        }

        login("bloqueio@exemplo.com", SENHA)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(content().json("{\"erro\":\"Muitas tentativas. Tente de novo em alguns minutos.\"}", true));
    }

    @Test
    void login_bloqueia_tambem_email_inexistente_sem_revelar_diferenca() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("fantasma@exemplo.com", "senha-errada-" + i).andExpect(status().isUnauthorized());
        }

        login("fantasma@exemplo.com", SENHA)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value("Muitas tentativas. Tente de novo em alguns minutos."));
    }

    @Test
    void login_certo_zera_o_contador_de_falhas() throws Exception {
        inserirUsuarioComSenha("zera@exemplo.com", SENHA);

        for (int i = 0; i < 4; i++) {
            login("zera@exemplo.com", "senha-errada-" + i).andExpect(status().isUnauthorized());
        }
        login("zera@exemplo.com", SENHA).andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            login("zera@exemplo.com", "senha-errada-" + i).andExpect(status().isUnauthorized());
        }

        login("zera@exemplo.com", SENHA).andExpect(status().isOk());
    }

    // ---- sessão: /me, rotas protegidas e logout -----------------------------------------

    @Test
    void me_sem_cookie_retorna_401() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void me_com_cookie_retorna_usuario() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Usuario Teste"))
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"))
                .andExpect(jsonPath("$.temSenha").value(true));
    }

    @Test
    void me_com_token_do_contrato_hs256_sub_id_funciona() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, id, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.temSenha").value(false));
    }

    @Test
    void me_com_token_lixo_retorna_401_com_corpo_erro() throws Exception {
        mvc.perform(get("/api/auth/me").cookie(new Cookie("cc_session", "isto.nao.eJwt")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void me_com_token_assinado_com_outro_segredo_retorna_401() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");
        Cookie cookie = new Cookie("cc_session",
                jwt("outro-segredo-falso-com-32-bytes-ou-mais", id, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void me_com_token_expirado_retorna_401() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, id, AGORA.minusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void me_com_token_de_usuario_que_nao_existe_mais_retorna_401() throws Exception {
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, 987654321L, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void token_no_header_authorization_nao_e_aceito() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");

        mvc.perform(get("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt(JWT_SECRET_TESTE, id, AGORA.plusSeconds(3600))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rota_protegida_sem_cookie_retorna_401_com_corpo_erro() throws Exception {
        mvc.perform(get("/api/qualquer-rota-protegida"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void logout_limpa_cookie() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(post("/api/auth/logout").cookie(cookie))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("cc_session=;"),
                        containsString("Max-Age=0"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Strict"),
                        containsString("Path=/"))));
    }

    // ---- definir senha -----------------------------------------------------------------

    @Test
    void definir_senha_logado_permite_login_com_nova_senha() throws Exception {
        long id = inserirUsuarioSemSenha("outra@exemplo.com");
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, id, AGORA.plusSeconds(3600)));

        MvcResult resposta = mvc.perform(put("/api/auth/senha").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"senha\":\"nova-senha-123\"}"))
                .andExpect(status().isNoContent())
                .andReturn();

        mvc.perform(get("/api/auth/me").cookie(cookieDe(resposta)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(true));
        login("outra@exemplo.com", "nova-senha-123")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temSenha").value(true));
        String hash = jdbc.queryForObject("select senha_hash from usuario where id = ?", String.class, id);
        assertThat(hash).startsWith("$2");
    }

    @Test
    void definir_senha_com_senha_curta_retorna_400() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(put("/api/auth/senha").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senha\":\"curta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha deve ter entre 8 e 72 caracteres."));
    }

    @Test
    void definir_senha_acima_de_72_bytes_retorna_400() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(put("/api/auth/senha").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senhaAtual\":\"" + SENHA + "\",\"senha\":\"" + "é".repeat(60) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha deve ter entre 8 e 72 caracteres."));
    }

    @Test
    void trocar_a_senha_invalida_o_cookie_antigo_e_o_novo_cookie_funciona() throws Exception {
        Cookie antigo = cookieDeUsuarioNovo("dono@exemplo.com");

        MvcResult resposta = mvc.perform(put("/api/auth/senha").cookie(antigo)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"senhaAtual\":\"" + SENHA + "\",\"senha\":\"nova-senha-123\"}"))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("cc_session="),
                        containsString("HttpOnly"),
                        containsString("SameSite=Strict"),
                        containsString("Max-Age=2592000"))))
                .andReturn();
        Cookie novo = cookieDe(resposta);

        mvc.perform(get("/api/auth/me").cookie(antigo))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
        mvc.perform(get("/api/auth/me").cookie(novo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dono@exemplo.com"));
        login("dono@exemplo.com", "nova-senha-123").andExpect(status().isOk());
        login("dono@exemplo.com", SENHA).andExpect(status().isUnauthorized());
    }

    @Test
    void definir_senha_com_senha_atual_errada_retorna_400_e_nao_troca() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(put("/api/auth/senha").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senhaAtual\":\"senha-errada-9\",\"senha\":\"nova-senha-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));

        login("dono@exemplo.com", SENHA).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isOk());
    }

    @Test
    void definir_senha_sem_informar_a_senha_atual_retorna_400_quando_o_usuario_tem_senha() throws Exception {
        Cookie cookie = cookieDeUsuarioNovo("dono@exemplo.com");

        mvc.perform(put("/api/auth/senha").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senha\":\"nova-senha-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));

        login("dono@exemplo.com", SENHA).andExpect(status().isOk());
    }

    @Test
    void token_com_versao_de_sessao_diferente_da_atual_retorna_401() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, String.valueOf(id), 1, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void token_sem_claim_de_versao_retorna_401() throws Exception {
        long id = inserirUsuarioSemSenha("semsenha@exemplo.com");
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, String.valueOf(id), null, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void token_valido_com_sub_nao_numerico_retorna_401_e_nao_500() throws Exception {
        Cookie cookie = new Cookie("cc_session", jwt(JWT_SECRET_TESTE, "nao-e-numero", 0, AGORA.plusSeconds(3600)));

        mvc.perform(get("/api/auth/me").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }

    @Test
    void rajada_concorrente_de_logins_errados_deixa_passar_no_maximo_5() throws Exception {
        inserirUsuarioComSenha("rajada@exemplo.com", SENHA);
        int tentativas = 12;
        ExecutorService pool = Executors.newFixedThreadPool(tentativas);
        CountDownLatch largada = new CountDownLatch(1);
        try {
            List<Future<Integer>> respostas = new ArrayList<>();
            for (int i = 0; i < tentativas; i++) {
                String senhaErrada = "senha-errada-" + i;
                respostas.add(pool.submit(() -> {
                    largada.await();
                    return login("rajada@exemplo.com", senhaErrada).andReturn().getResponse().getStatus();
                }));
            }
            largada.countDown();
            int verificadas = 0;
            int bloqueadas = 0;
            for (Future<Integer> resposta : respostas) {
                int codigo = resposta.get(30, TimeUnit.SECONDS);
                if (codigo == 429) {
                    bloqueadas++;
                } else {
                    assertThat(codigo).isEqualTo(401);
                    verificadas++;
                }
            }
            assertThat(verificadas).isLessThanOrEqualTo(5);
            assertThat(bloqueadas).isEqualTo(tentativas - verificadas);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void definir_senha_sem_cookie_retorna_401() throws Exception {
        mvc.perform(put("/api/auth/senha").contentType(MediaType.APPLICATION_JSON)
                .content("{\"senha\":\"nova-senha-123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não autenticado."));
    }
}
