package dev.lmaciel.aprumo.diagnostico;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import dev.lmaciel.aprumo.auth.CodigosEmail;
import dev.lmaciel.aprumo.comum.MuitasTentativasException;

/**
 * Limita os relatos de erro, para a rota pública não virar spam nem encher o log:
 * <ul>
 * <li>teto global de 200 relatos por minuto, conferido primeiro;</li>
 * <li>20 relatos por IP a cada 10 minutos.</li>
 * </ul>
 * Fica em memória (a API roda em uma única instância). A chave do mapa é o HMAC do IP, nunca o IP, para
 * bater com a política de privacidade. O mapa guarda no máximo 10 000 chaves: cheio, os baldes vencidos são
 * podados e, se ainda estiver cheio, um IP novo é recusado (429). Nunca se limpa o mapa de uma vez, senão
 * quem encher o mapa zeraria o limite de todos.
 *
 * <p>Os pedidos recusados não prorrogam as janelas.
 */
@Component
public class LimiteRelatos {

    static final int MAX_RELATOS = 20;
    static final Duration JANELA = Duration.ofMinutes(10);
    static final int MAX_IPS = 10_000;
    static final int MAX_GLOBAL_POR_MINUTO = 200;
    private static final Duration JANELA_GLOBAL = Duration.ofMinutes(1);

    private record Balde(Instant inicio, int relatos) {

        boolean vigente(Instant agora) {
            return agora.isBefore(inicio.plus(JANELA));
        }
    }

    private final Clock clock;
    private final CodigosEmail codigos;
    private final int maxGlobalPorMinuto;
    private final int maxIps;
    private final ConcurrentHashMap<String, Balde> baldes = new ConcurrentHashMap<>();
    private final Object trava = new Object();
    private Instant inicioJanelaGlobal;
    private int relatosNaJanelaGlobal;

    @Autowired
    public LimiteRelatos(Clock clock, CodigosEmail codigos) {
        this(clock, codigos, MAX_GLOBAL_POR_MINUTO, MAX_IPS);
    }

    LimiteRelatos(Clock clock, CodigosEmail codigos, int maxGlobalPorMinuto, int maxIps) {
        this.clock = clock;
        this.codigos = codigos;
        this.maxGlobalPorMinuto = maxGlobalPorMinuto;
        this.maxIps = maxIps;
    }

    /**
     * Reserva um relato para o IP.
     *
     * @throws MuitasTentativasException se o teto global, o balde do IP ou o mapa cheio recusam o relato
     */
    public void reservar(String ip) {
        Instant agora = clock.instant();
        synchronized (trava) {
            reservarGlobal(agora);
            reservarPorIp(codigos.hmac(ip), agora);
        }
    }

    private void reservarGlobal(Instant agora) {
        if (inicioJanelaGlobal == null || !agora.isBefore(inicioJanelaGlobal.plus(JANELA_GLOBAL))) {
            inicioJanelaGlobal = agora;
            relatosNaJanelaGlobal = 0;
        }
        if (relatosNaJanelaGlobal >= maxGlobalPorMinuto) {
            throw new MuitasTentativasException();
        }
        relatosNaJanelaGlobal++;
    }

    private void reservarPorIp(String chave, Instant agora) {
        Balde atual = baldes.get(chave);
        if (atual == null && baldes.size() >= maxIps) {
            baldes.values().removeIf(balde -> !balde.vigente(agora));
            if (baldes.size() >= maxIps) {
                relatosNaJanelaGlobal--;
                throw new MuitasTentativasException();
            }
        }
        if (atual == null || !atual.vigente(agora)) {
            baldes.put(chave, new Balde(agora, 1));
        } else if (atual.relatos() >= MAX_RELATOS) {
            relatosNaJanelaGlobal--;
            throw new MuitasTentativasException();
        } else {
            baldes.put(chave, new Balde(atual.inicio(), atual.relatos() + 1));
        }
    }

    int tamanho() {
        return baldes.size();
    }

    Set<String> chaves() {
        return Set.copyOf(baldes.keySet());
    }
}
