package dev.lmaciel.aprumo.exportacao;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.stereotype.Component;

/**
 * Deixa cada usuário exportar os dados no máximo uma vez a cada 30 segundos: a exportação lê a conta inteira.
 * A reserva é atômica, então requisições paralelas não passam juntas. Recusa não prorroga o bloqueio.
 *
 * <p>Fica em memória (a API roda em uma única instância); o contador zera se ela reiniciar.
 */
@Component
public class LimiteExportacao {

    static final Duration INTERVALO = Duration.ofSeconds(30);
    /** Acima disso, entradas vencidas são varridas para o mapa não crescer sem limite. */
    private static final int LIMITE_PARA_LIMPEZA = 10_000;

    private final Clock clock;
    private final ConcurrentHashMap<Long, Instant> ultimas = new ConcurrentHashMap<>();

    public LimiteExportacao(Clock clock) {
        this.clock = clock;
    }

    /** {@code true} se o usuário pode exportar agora (e a exportação fica registrada). */
    public boolean reservar(long usuarioId) {
        Instant agora = clock.instant();
        AtomicBoolean liberada = new AtomicBoolean();
        ultimas.compute(usuarioId, (chave, ultima) -> {
            if (ultima == null || !agora.isBefore(ultima.plus(INTERVALO))) {
                liberada.set(true);
                return agora;
            }
            return ultima;
        });
        if (ultimas.size() > LIMITE_PARA_LIMPEZA) {
            ultimas.values().removeIf(ultima -> !agora.isBefore(ultima.plus(INTERVALO)));
        }
        return liberada.get();
    }
}
