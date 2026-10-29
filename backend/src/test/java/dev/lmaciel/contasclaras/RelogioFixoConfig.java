package dev.lmaciel.contasclaras;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Fixa "hoje" em 2026-10-29 12:00 (America/Sao_Paulo) para os testes de integração.
 */
@TestConfiguration(proxyBeanMethods = false)
class RelogioFixoConfig {

    @Bean
    @Primary
    Clock relogioFixo() {
        return Clock.fixed(OffsetDateTime.parse("2026-10-29T12:00:00-03:00").toInstant(),
                ZoneId.of("America/Sao_Paulo"));
    }
}
