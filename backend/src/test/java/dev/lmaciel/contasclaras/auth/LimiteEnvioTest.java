package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.contasclaras.IntegracaoTest;
import dev.lmaciel.contasclaras.comum.MuitasTentativasException;

/**
 * O relógio dos testes é fixo, então o tempo "passa" editando {@code criado_em} por SQL.
 */
class LimiteEnvioTest extends IntegracaoTest {

    private static final String MENSAGEM_429 = "Muitos pedidos agora. Tente de novo mais tarde.";

    @Autowired
    LimiteEnvio limite;

    @Autowired
    CodigosEmail codigos;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    Clock clock;

    @BeforeEach
    @AfterEach
    void limparRegistros() {
        jdbc.update("delete from envio_email");
    }

    private long total() {
        return jdbc.queryForObject("select count(*) from envio_email", Long.class);
    }

    /** Empurra para o passado todos os registros existentes. */
    private void envelhecer(Duration tempo) {
        jdbc.update("update envio_email set criado_em = criado_em - ?::interval", tempo.toSeconds() + " seconds");
    }

    /** Insere {@code quantidade} registros de e-mails e IPs distintos, criados há {@code idade}. */
    private void inserirDeOutros(int quantidade, Duration idade) {
        jdbc.update("""
                insert into envio_email (email_hmac, ip_hmac, criado_em)
                select md5('email' || g), md5('ip' || g), ? from generate_series(1, ?) g""",
                Timestamp.from(clock.instant().minus(idade)), quantidade);
    }

    @Test
    void primeira_reserva_grava_registro_com_hmac_sem_email_nem_ip_em_claro() {
        Optional<Long> id = limite.reservar(" Ana@Exemplo.com ", "203.0.113.7");

        assertThat(id).isPresent();
        Map<String, Object> linha = jdbc.queryForMap("select * from envio_email");
        assertThat(linha.get("id")).isEqualTo(id.get());
        assertThat(linha.get("email_hmac")).isEqualTo(codigos.hmac("ana@exemplo.com"));
        assertThat(linha.get("ip_hmac")).isEqualTo(codigos.hmac("203.0.113.7"));
        assertThat(linha.toString()).doesNotContain("ana@exemplo.com").doesNotContain("203.0.113.7");
        assertThat(((Timestamp) linha.get("criado_em")).toInstant()).isEqualTo(clock.instant());
    }

    @Test
    void segunda_reserva_em_menos_de_60s_devolve_vazio() {
        assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
        envelhecer(Duration.ofSeconds(59));

        assertThat(limite.reservar("ANA@exemplo.com", "203.0.113.8")).isEmpty();
        assertThat(total()).isEqualTo(1);

        envelhecer(Duration.ofSeconds(1));

        assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
        assertThat(total()).isEqualTo(2);
    }

    @Test
    void quarto_envio_na_hora_do_mesmo_email_lanca_429() {
        for (int i = 0; i < 3; i++) {
            assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
            envelhecer(Duration.ofMinutes(2));
        }

        assertThatThrownBy(() -> limite.reservar("ana@exemplo.com", "203.0.113.7"))
                .isInstanceOf(MuitasTentativasException.class)
                .hasMessage(MENSAGEM_429);
        assertThat(total()).isEqualTo(3);

        // Passada a hora do primeiro envio, volta a valer a vez.
        envelhecer(Duration.ofMinutes(55));
        assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
    }

    @Test
    void decimo_primeiro_envio_na_hora_do_mesmo_ip_lanca_429() {
        for (int i = 0; i < 10; i++) {
            assertThat(limite.reservar("pessoa" + i + "@exemplo.com", "203.0.113.7")).isPresent();
        }

        assertThatThrownBy(() -> limite.reservar("pessoa10@exemplo.com", "203.0.113.7"))
                .isInstanceOf(MuitasTentativasException.class)
                .hasMessage(MENSAGEM_429);
        assertThat(total()).isEqualTo(10);
        assertThat(limite.reservar("pessoa10@exemplo.com", "203.0.113.8")).isPresent();
    }

    @Test
    void envio_301_em_24h_lanca_429_para_qualquer_email_e_ip() {
        inserirDeOutros(299, Duration.ofHours(5));

        assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
        assertThat(total()).isEqualTo(300);

        assertThatThrownBy(() -> limite.reservar("bia@exemplo.com", "198.51.100.9"))
                .isInstanceOf(MuitasTentativasException.class)
                .hasMessage(MENSAGEM_429);
        assertThat(total()).isEqualTo(300);
    }

    @Test
    void limite_por_ip_vence_o_prazo_de_60s() {
        for (int i = 0; i < 10; i++) {
            limite.reservar("pessoa" + i + "@exemplo.com", "203.0.113.7");
        }

        // pessoa0 está dentro dos 60 s, mas o IP já estourou: só o prazo responde em silêncio, o limite não.
        assertThatThrownBy(() -> limite.reservar("pessoa0@exemplo.com", "203.0.113.7"))
                .isInstanceOf(MuitasTentativasException.class);
    }

    @Test
    void liberar_apaga_o_registro_e_permite_reserva_imediata() {
        long id = limite.reservar("ana@exemplo.com", "203.0.113.7").orElseThrow();

        limite.liberar(id);

        assertThat(total()).isZero();
        assertThat(limite.reservar("ana@exemplo.com", "203.0.113.7")).isPresent();
    }

    @Test
    void registros_com_mais_de_24h_sao_apagados_na_reserva() {
        inserirDeOutros(2, Duration.ofHours(25));
        jdbc.update("""
                insert into envio_email (email_hmac, ip_hmac, criado_em) values ('recente', 'recente', ?)""",
                Timestamp.from(clock.instant().minus(Duration.ofHours(23))));

        limite.reservar("ana@exemplo.com", "203.0.113.7");

        List<String> restantes = jdbc.queryForList("select email_hmac from envio_email order by id", String.class);
        assertThat(restantes).hasSize(2).contains("recente", codigos.hmac("ana@exemplo.com"));
        Instant maisAntigo = jdbc.queryForObject("select min(criado_em) from envio_email", Timestamp.class)
                .toInstant();
        assertThat(maisAntigo).isAfter(clock.instant().minus(Duration.ofHours(24)));
    }

    @Test
    void reservas_paralelas_do_mesmo_email_resultam_em_exatamente_um_registro() throws Exception {
        int pedidos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(pedidos);
        try {
            // A corrida é estreita: várias rodadas, para que sem o lock ela apareça de forma confiável.
            for (int rodada = 0; rodada < 25; rodada++) {
                jdbc.update("delete from envio_email");
                CountDownLatch largada = new CountDownLatch(1);
                List<Future<Optional<Long>>> respostas = new ArrayList<>();
                for (int i = 0; i < pedidos; i++) {
                    respostas.add(pool.submit(() -> {
                        largada.await();
                        return limite.reservar("ana@exemplo.com", "203.0.113.7");
                    }));
                }
                largada.countDown();
                int reservadas = 0;
                for (Future<Optional<Long>> resposta : respostas) {
                    if (resposta.get(60, TimeUnit.SECONDS).isPresent()) {
                        reservadas++;
                    }
                }
                assertThat(reservadas).as("reservas na rodada %d", rodada).isEqualTo(1);
                assertThat(total()).as("registros na rodada %d", rodada).isEqualTo(1);
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
