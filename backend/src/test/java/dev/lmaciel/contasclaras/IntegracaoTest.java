package dev.lmaciel.contasclaras;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base dos testes de integração: Postgres real (Testcontainers) e relógio fixo.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Import(RelogioFixoConfig.class)
public abstract class IntegracaoTest {

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
}
