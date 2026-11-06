package dev.lmaciel.aprumo.diagnostico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.lmaciel.aprumo.comum.MuitasTentativasException;

class LimiteRelatosTest {

    static class RelogioMutavel extends Clock {

        Instant agora = Instant.parse("2026-10-29T15:00:00Z");

        void avancar(Duration d) {
            agora = agora.plus(d);
        }

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

    private RelogioMutavel relogio;
    private LimiteRelatos limite;

    @BeforeEach
    void preparar() {
        relogio = new RelogioMutavel();
        limite = new LimiteRelatos(relogio);
    }

    private void relatar(String ip, int vezes) {
        for (int i = 0; i < vezes; i++) {
            limite.reservar(ip);
        }
    }

    @Test
    void aceita_20_relatos_e_recusa_o_21o_do_mesmo_ip() {
        relatar("198.51.100.1", LimiteRelatos.MAX_RELATOS);

        assertThatThrownBy(() -> limite.reservar("198.51.100.1"))
                .isInstanceOf(MuitasTentativasException.class);
    }

    @Test
    void cada_ip_tem_o_seu_balde() {
        relatar("198.51.100.1", LimiteRelatos.MAX_RELATOS);

        assertThatCode(() -> limite.reservar("198.51.100.2")).doesNotThrowAnyException();
    }

    @Test
    void o_balde_renova_depois_de_10_minutos() {
        relatar("198.51.100.1", LimiteRelatos.MAX_RELATOS);

        relogio.avancar(Duration.ofMinutes(9));
        assertThatThrownBy(() -> limite.reservar("198.51.100.1")).isInstanceOf(MuitasTentativasException.class);

        relogio.avancar(Duration.ofMinutes(1));
        assertThatCode(() -> limite.reservar("198.51.100.1")).doesNotThrowAnyException();
    }

    @Test
    void recusado_nao_prorroga_o_bloqueio() {
        relatar("198.51.100.1", LimiteRelatos.MAX_RELATOS);
        relogio.avancar(Duration.ofMinutes(5));
        assertThatThrownBy(() -> limite.reservar("198.51.100.1")).isInstanceOf(MuitasTentativasException.class);

        relogio.avancar(Duration.ofMinutes(5));
        assertThatCode(() -> limite.reservar("198.51.100.1")).doesNotThrowAnyException();
    }

    @Test
    void o_mapa_nunca_passa_de_10_mil_ips() {
        for (int i = 0; i < LimiteRelatos.MAX_IPS; i++) {
            limite.reservar("ip-" + i);
        }
        assertThat(limite.tamanho()).isEqualTo(LimiteRelatos.MAX_IPS);

        limite.reservar("ip-novo");

        assertThat(limite.tamanho()).isEqualTo(1);
    }

    @Test
    void ao_encher_os_baldes_vencidos_saem_primeiro() {
        for (int i = 0; i < LimiteRelatos.MAX_IPS; i++) {
            limite.reservar("ip-" + i);
        }
        relogio.avancar(Duration.ofMinutes(10));

        limite.reservar("ip-novo");

        assertThat(limite.tamanho()).isEqualTo(1);
    }
}
