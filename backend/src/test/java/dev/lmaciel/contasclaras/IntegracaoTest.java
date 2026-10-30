package dev.lmaciel.contasclaras;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import jakarta.servlet.http.Cookie;

/**
 * Base dos testes de integração: Postgres real (Testcontainers) e relógio fixo.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Import(RelogioFixoConfig.class)
@TestPropertySource(properties = {
        "app.jwt.secret=" + IntegracaoTest.JWT_SECRET_TESTE,
        "app.allowed-emails=" + IntegracaoTest.EMAILS_LIBERADOS_TESTE,
        "app.google.client-id=" + IntegracaoTest.GOOGLE_CLIENT_ID_TESTE
})
public abstract class IntegracaoTest {

    /** Segredo obviamente falso, só para os testes (HS256 exige pelo menos 32 bytes). */
    protected static final String JWT_SECRET_TESTE = "segredo-falso-so-para-testes-0123456789";

    protected static final String EMAILS_LIBERADOS_TESTE = "dono@exemplo.com,outra@exemplo.com";

    /** Client ID obviamente falso: os testes nunca falam com o Google. */
    protected static final String GOOGLE_CLIENT_ID_TESTE = "client-id-falso.apps.exemplo.com";

    /**
     * Um único container para toda a JVM de testes. O contexto do Spring é reaproveitado
     * entre as classes de teste, então o container não pode ser parado ao fim de cada classe
     * (o que o par @Testcontainers/@Container faria); o Ryuk o remove ao fim da execução.
     */
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbcDaBase;

    /**
     * A chave de {@code lancamento.item_id} é RESTRICT: com lançamento sobrando, o {@code delete from usuario}
     * que os testes usam para limpar falha. Antes (herdado de um teste anterior) e depois (para o próximo),
     * os lançamentos saem primeiro.
     */
    @BeforeEach
    @AfterEach
    void limparLancamentos() {
        jdbcDaBase.update("delete from lancamento");
    }

    /** Cadastra o e-mail (precisa estar na lista liberada) e devolve o cookie {@code cc_session} da sessão. */
    protected Cookie cadastrarEEntrar(String email) throws Exception {
        String setCookie = mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Usuario Teste","email":"%s","senha":"senha-segura-1"}""".formatted(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith("cc_session=");
        return new Cookie("cc_session", setCookie.substring("cc_session=".length(), setCookie.indexOf(';')));
    }
}
