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

import dev.lmaciel.aprumo.auth.CodigosEmail;
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

    private static final String SEGREDO = "segredo-falso-so-para-testes-0123456789";

    private RelogioMutavel relogio;
    private CodigosEmail codigos;
    private LimiteRelatos limite;

    @BeforeEach
    void preparar() {
        relogio = new RelogioMutavel();
        codigos = new CodigosEmail(SEGREDO);
        limite = new LimiteRelatos(relogio, codigos);
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
    void a_chave_do_mapa_e_o_hmac_do_ip_e_nunca_o_ip() {
        limite.reservar("198.51.100.1");

        assertThat(limite.chaves()).containsExactly(codigos.hmac("198.51.100.1"));
    }

    @Test
    void mapa_cheio_recusa_ip_novo_com_429_e_nao_limpa_nada() {
        LimiteRelatos pequeno = new LimiteRelatos(relogio, codigos, 1000, 3);
        pequeno.reservar("ip-1");
        pequeno.reservar("ip-2");
        pequeno.reservar("ip-3");

        assertThatThrownBy(() -> pequeno.reservar("ip-4")).isInstanceOf(MuitasTentativasException.class);

        assertThat(pequeno.tamanho()).isEqualTo(3);
        // quem já está no mapa segue contando normalmente
        assertThatCode(() -> pequeno.reservar("ip-1")).doesNotThrowAnyException();
    }

    @Test
    void mapa_cheio_poda_os_baldes_vencidos_antes_de_recusar() {
        LimiteRelatos pequeno = new LimiteRelatos(relogio, codigos, 1000, 3);
        pequeno.reservar("ip-1");
        pequeno.reservar("ip-2");
        pequeno.reservar("ip-3");
        relogio.avancar(Duration.ofMinutes(10));

        assertThatCode(() -> pequeno.reservar("ip-4")).doesNotThrowAnyException();

        assertThat(pequeno.tamanho()).isEqualTo(1);
    }

    @Test
    void teto_global_de_200_relatos_por_minuto_vale_para_qualquer_ip() {
        for (int i = 0; i < LimiteRelatos.MAX_GLOBAL_POR_MINUTO; i++) {
            limite.reservar("ip-" + i);
        }

        assertThatThrownBy(() -> limite.reservar("ip-novo")).isInstanceOf(MuitasTentativasException.class);

        relogio.avancar(Duration.ofMinutes(1));
        assertThatCode(() -> limite.reservar("ip-novo")).doesNotThrowAnyException();
    }

    @Test
    void teto_global_e_conferido_antes_do_balde_do_ip() {
        LimiteRelatos pequeno = new LimiteRelatos(relogio, codigos, 2, 100);
        pequeno.reservar("ip-1");
        pequeno.reservar("ip-2");

        assertThatThrownBy(() -> pequeno.reservar("ip-3")).isInstanceOf(MuitasTentativasException.class);

        // o recusado pelo teto global nem chegou a criar balde
        assertThat(pequeno.tamanho()).isEqualTo(2);
    }
}
