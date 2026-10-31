package dev.lmaciel.contasclaras.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.comum.MuitasTentativasException;

/**
 * Limita os e-mails enviados, contando no banco (a API roda em várias instâncias). Cada envio reserva uma
 * linha em {@code envio_email}, com HMAC do e-mail e do IP, nunca os valores em claro. Linhas com mais de
 * 24 h são apagadas a cada reserva.
 *
 * <p>As reservas são serializadas por um {@code pg_advisory_xact_lock} tomado antes de contar, então pedidos
 * paralelos (da mesma instância ou de outras) não passam juntos pelas checagens. O limite global de 300 deixa
 * uma margem de 200 abaixo dos 500 e-mails por dia do Gmail.
 */
@Service
public class LimiteEnvio {

    static final Duration INTERVALO_MINIMO = Duration.ofSeconds(60);
    static final int MAX_POR_EMAIL_HORA = 3;
    static final int MAX_POR_IP_HORA = 10;
    static final int MAX_GLOBAL_24H = 300;

    private static final Duration HORA = Duration.ofHours(1);
    private static final Duration DIA = Duration.ofHours(24);
    /** Chave do lock consultivo que serializa {@link #reservar}; só precisa ser única entre os locks do banco. */
    static final long CHAVE_LOCK_RESERVA = 7_301_001L;

    private static final String MENSAGEM_LIMITE = "Muitos pedidos agora. Tente de novo mais tarde.";

    private final RegistroEnvioRepository registros;
    private final JdbcTemplate jdbc;
    private final CodigosEmail codigos;
    private final Clock clock;

    public LimiteEnvio(RegistroEnvioRepository registros, JdbcTemplate jdbc, CodigosEmail codigos, Clock clock) {
        this.registros = registros;
        this.jdbc = jdbc;
        this.codigos = codigos;
        this.clock = clock;
    }

    /**
     * Reserva um envio para o e-mail e o IP.
     *
     * <p>Toma antes um lock consultivo da transação, o que serializa as reservas de todas as instâncias.
     *
     * <p>A ordem das checagens é global, IP, 60 s e hora por e-mail, porque só o prazo de 60 s responde em
     * silêncio.
     *
     * @return o id do registro, ou vazio se o último envio ao e-mail tem menos de 60 s (o chamador responde
     *         {@code 202} sem enviar e sem consumir limite)
     * @throws MuitasTentativasException se algum limite por hora ou global foi atingido
     */
    @Transactional
    public Optional<Long> reservar(String email, String ip) {
        // Solto sozinho no commit ou rollback. Vem antes de qualquer leitura: o segundo pedido só conta depois
        // de o primeiro gravar o registro.
        jdbc.query("select pg_advisory_xact_lock(?)", rs -> {
        }, CHAVE_LOCK_RESERVA);
        Instant agora = clock.instant();
        registros.deleteByCriadoEmBefore(agora.minus(DIA));

        String emailHmac = codigos.hmac(Emails.normalizar(email));
        String ipHmac = codigos.hmac(ip);

        if (registros.countByCriadoEmAfter(agora.minus(DIA)) >= MAX_GLOBAL_24H) {
            throw limiteAtingido();
        }
        if (registros.countByIpHmacAndCriadoEmAfter(ipHmac, agora.minus(HORA)) >= MAX_POR_IP_HORA) {
            throw limiteAtingido();
        }
        boolean dentroDoIntervalo = registros.findFirstByEmailHmacOrderByCriadoEmDesc(emailHmac)
                .map(ultimo -> ultimo.getCriadoEm().isAfter(agora.minus(INTERVALO_MINIMO)))
                .orElse(false);
        if (dentroDoIntervalo) {
            return Optional.empty();
        }
        if (registros.countByEmailHmacAndCriadoEmAfter(emailHmac, agora.minus(HORA)) >= MAX_POR_EMAIL_HORA) {
            throw limiteAtingido();
        }
        return Optional.of(registros.save(new RegistroEnvio(emailHmac, ipHmac, agora)).getId());
    }

    /** Desfaz a reserva depois de uma falha de SMTP: o envio que não saiu não conta no limite nem no prazo de 60 s. */
    @Transactional
    public void liberar(long registroId) {
        registros.deleteById(registroId);
    }

    private static MuitasTentativasException limiteAtingido() {
        return new MuitasTentativasException(MENSAGEM_LIMITE);
    }
}
