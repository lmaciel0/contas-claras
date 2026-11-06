package dev.lmaciel.aprumo.diagnostico;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import dev.lmaciel.aprumo.comum.MuitasTentativasException;

/**
 * Deixa passar no máximo 20 relatos de erro por IP a cada 10 minutos, para a rota pública não virar spam
 * nem encher o log. Fica em memória (a API roda em uma única instância). O mapa guarda no máximo 10 000 IPs:
 * ao encher, saem primeiro os baldes vencidos e, se ainda estiver cheio, limpa tudo.
 *
 * <p>Os pedidos recusados não prorrogam a janela.
 */
@Component
public class LimiteRelatos {

    static final int MAX_RELATOS = 20;
    static final Duration JANELA = Duration.ofMinutes(10);
    static final int MAX_IPS = 10_000;

    private record Balde(Instant inicio, int relatos) {

        boolean vigente(Instant agora) {
            return agora.isBefore(inicio.plus(JANELA));
        }
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Balde> baldes = new ConcurrentHashMap<>();

    public LimiteRelatos(Clock clock) {
        this.clock = clock;
    }

    /**
     * Reserva um relato para o IP.
     *
     * @throws MuitasTentativasException se o IP já gastou os 20 relatos da janela
     */
    public void reservar(String ip) {
        Instant agora = clock.instant();
        if (baldes.size() >= MAX_IPS && !baldes.containsKey(ip)) {
            baldes.values().removeIf(balde -> !balde.vigente(agora));
            if (baldes.size() >= MAX_IPS) {
                baldes.clear();
            }
        }
        boolean[] liberado = { false };
        baldes.compute(ip, (chave, atual) -> {
            if (atual == null || !atual.vigente(agora)) {
                liberado[0] = true;
                return new Balde(agora, 1);
            }
            if (atual.relatos() >= MAX_RELATOS) {
                return atual;
            }
            liberado[0] = true;
            return new Balde(atual.inicio(), atual.relatos() + 1);
        });
        if (!liberado[0]) {
            throw new MuitasTentativasException();
        }
    }

    int tamanho() {
        return baldes.size();
    }
}
