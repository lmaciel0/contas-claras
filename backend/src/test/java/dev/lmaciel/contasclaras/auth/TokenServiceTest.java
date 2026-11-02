package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class TokenServiceTest {

    @Test
    void validadePadraoDoTokenDeveSerDe24Horas() {
        assertThat(TokenService.VALIDADE).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void emitirGeraTokenComExpiracaoEm24Horas() {
        Instant agora = Instant.parse("2026-11-02T10:00:00Z");
        Clock clock = Clock.fixed(agora, ZoneOffset.UTC);
        TokenService service = new TokenService("01234567890123456789012345678901", clock);

        String token = service.emitir(42L, 1);
        assertThat(token).isNotBlank();
    }
}
