package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

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

    /** Quantas tentativas, de um total pedido, o limitador deixou passar. */
    private int tentar(String email, int vezes) {
        int liberadas = 0;
        for (int i = 0; i < vezes; i++) {
            if (limite.reservarTentativa(email)) {
                liberadas++;
            }
        }
        return liberadas;
    }

    @Test
    void as_cinco_primeiras_tentativas_passam_e_a_sexta_e_bloqueada() {
        assertThat(tentar("dono@exemplo.com", 5)).isEqualTo(5);

        assertThat(limite.reservarTentativa("dono@exemplo.com")).isFalse();
    }

    @Test
    void bloqueio_e_por_email_e_ignora_maiusculas_e_espacos() {
        tentar("dono@exemplo.com", 5);

        assertThat(limite.reservarTentativa("outra@exemplo.com")).isTrue();
        assertThat(limite.reservarTentativa("  DONO@Exemplo.com ")).isFalse();
    }

    @Test
    void libera_depois_de_15_minutos() {
        tentar("dono@exemplo.com", 5);

        relogio.avancar(Duration.ofMinutes(14));
        assertThat(limite.reservarTentativa("dono@exemplo.com")).isFalse();

        relogio.avancar(Duration.ofMinutes(1));
        assertThat(limite.reservarTentativa("dono@exemplo.com")).isTrue();
    }

    @Test
    void tentativas_antigas_nao_somam_com_as_novas() {
        tentar("dono@exemplo.com", 4);
        relogio.avancar(Duration.ofMinutes(16));

        assertThat(tentar("dono@exemplo.com", 5)).isEqualTo(5);
    }

    @Test
    void login_certo_zera_o_contador() {
        tentar("dono@exemplo.com", 4);
        limite.registrarSucesso("dono@exemplo.com");

        assertThat(tentar("dono@exemplo.com", 5)).isEqualTo(5);
    }

    @Test
    void tentativas_bloqueadas_nao_prorrogam_a_janela() {
        tentar("dono@exemplo.com", 5);
        relogio.avancar(Duration.ofMinutes(10));
        tentar("dono@exemplo.com", 3);
        relogio.avancar(Duration.ofMinutes(5));

        assertThat(limite.reservarTentativa("dono@exemplo.com")).isTrue();
    }

    @Test
    void rajada_concorrente_nunca_libera_mais_que_cinco() throws Exception {
        int threads = 50;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch largada = new CountDownLatch(1);
        AtomicInteger liberadas = new AtomicInteger();
        try {
            List<Future<?>> futuros = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futuros.add(pool.submit(() -> {
                    largada.await();
                    if (limite.reservarTentativa("dono@exemplo.com")) {
                        liberadas.incrementAndGet();
                    }
                    return null;
                }));
            }
            largada.countDown();
            for (Future<?> futuro : futuros) {
                futuro.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(liberadas.get()).isEqualTo(5);
    }
}
