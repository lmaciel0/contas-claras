package dev.lmaciel.contasclaras.importacao;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * O profile {@code importar} tem que subir a aplicação inteira sem servidor web: nenhum bean pode exigir
 * infraestrutura web (já aconteceu com o {@code SecurityFilterChain}). O runner é trocado por um mock porque o
 * de verdade encerra a JVM. Não estende {@code IntegracaoTest}, que monta MockMvc e exige contexto web.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("importar")
@TestPropertySource(properties = {
        "app.jwt.secret=segredo-falso-so-para-testes-0123456789",
        "app.google.client-id=client-id-falso.apps.exemplo.com"
})
class ImportacaoPerfilTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @MockitoBean
    ImportacaoRunner runner;

    @Autowired
    ApplicationContext contexto;

    @Autowired
    Environment ambiente;

    @Test
    void sobe_sem_servidor_web_e_com_a_configuracao_do_profile() {
        assertThat(contexto).isNotInstanceOf(WebApplicationContext.class);
        assertThat(ambiente.getProperty("spring.main.web-application-type")).isEqualTo("none");
        assertThat(contexto.getBeansOfType(ImportacaoService.class)).hasSize(1);
    }
}
