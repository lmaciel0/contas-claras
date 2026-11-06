package dev.lmaciel.aprumo.exportacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LimiteExportacaoTest {

    static class RelogioMutavel extends Clock {

        Instant agora = Instant.parse("2026-10-29T15:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }

    RelogioMutavel relogio;
    LimiteExportacao limite;

    @BeforeEach
    void montar() {
        relogio = new RelogioMutavel();
        limite = new LimiteExportacao(relogio);
    }

    @Test
    void primeiraPassaESegundaDentroDe30sNao() {
        assertThat(limite.reservar(1)).isTrue();
        relogio.agora = relogio.agora.plus(Duration.ofSeconds(29));
        assertThat(limite.reservar(1)).isFalse();
    }

    @Test
    void recusaNaoProrrogaOBloqueio() {
        limite.reservar(1);
        relogio.agora = relogio.agora.plus(Duration.ofSeconds(20));
        limite.reservar(1);
        relogio.agora = relogio.agora.plus(Duration.ofSeconds(10));
        assertThat(limite.reservar(1)).isTrue();
    }

    @Test
    void usuariosSaoIndependentes() {
        assertThat(limite.reservar(1)).isTrue();
        assertThat(limite.reservar(2)).isTrue();
    }
}
