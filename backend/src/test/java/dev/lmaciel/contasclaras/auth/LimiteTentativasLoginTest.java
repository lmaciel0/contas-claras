package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LimiteTentativasLoginTest {

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

    RelogioMutavel relogio;
    LimiteTentativasLogin limite;

    @BeforeEach
    void montar() {
        relogio = new RelogioMutavel();
        limite = new LimiteTentativasLogin(relogio);
    }

    private void falhar(String email, int vezes) {
        for (int i = 0; i < vezes; i++) {
            limite.registrarFalha(email);
        }
    }

    @Test
    void quatro_falhas_ainda_nao_bloqueiam() {
        falhar("dono@exemplo.com", 4);

        assertThat(limite.bloqueado("dono@exemplo.com")).isFalse();
    }

    @Test
    void cinco_falhas_seguidas_bloqueiam() {
        falhar("dono@exemplo.com", 5);

        assertThat(limite.bloqueado("dono@exemplo.com")).isTrue();
    }

    @Test
    void bloqueio_e_por_email_e_ignora_maiusculas_e_espacos() {
        falhar("dono@exemplo.com", 5);

        assertThat(limite.bloqueado("outra@exemplo.com")).isFalse();
        assertThat(limite.bloqueado("  DONO@Exemplo.com ")).isTrue();
    }

    @Test
    void libera_depois_de_15_minutos() {
        falhar("dono@exemplo.com", 5);

        relogio.avancar(Duration.ofMinutes(14));
        assertThat(limite.bloqueado("dono@exemplo.com")).isTrue();

        relogio.avancar(Duration.ofMinutes(1));
        assertThat(limite.bloqueado("dono@exemplo.com")).isFalse();
    }

    @Test
    void falhas_antigas_nao_somam_com_as_novas() {
        falhar("dono@exemplo.com", 4);
        relogio.avancar(Duration.ofMinutes(16));
        falhar("dono@exemplo.com", 4);

        assertThat(limite.bloqueado("dono@exemplo.com")).isFalse();
    }

    @Test
    void login_certo_zera_o_contador() {
        falhar("dono@exemplo.com", 4);
        limite.registrarSucesso("dono@exemplo.com");
        falhar("dono@exemplo.com", 4);

        assertThat(limite.bloqueado("dono@exemplo.com")).isFalse();
    }

    @Test
    void bloqueio_nao_e_prorrogado_por_novas_falhas_dentro_da_janela() {
        falhar("dono@exemplo.com", 5);
        relogio.avancar(Duration.ofMinutes(10));
        falhar("dono@exemplo.com", 3);
        relogio.avancar(Duration.ofMinutes(5));

        assertThat(limite.bloqueado("dono@exemplo.com")).isFalse();
    }
}
