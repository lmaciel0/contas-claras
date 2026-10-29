package dev.lmaciel.contasclaras.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Trava o login de um e-mail depois de 5 falhas dentro de 15 minutos. Fica em memória: a API roda em
 * uma única instância e o contador zera se ela reiniciar, o que é aceitável para este uso. Conta também
 * e-mails que não existem, para não revelar quais e-mails têm conta.
 */
@Component
public class LimiteTentativasLogin {

    static final int MAX_FALHAS = 5;
    static final Duration JANELA = Duration.ofMinutes(15);
    /** Acima disso, janelas vencidas são varridas para o mapa não crescer sem limite. */
    private static final int LIMITE_PARA_LIMPEZA = 10_000;

    private record Janela(Instant inicio, int falhas) {

        boolean vigente(Instant agora) {
            return agora.isBefore(inicio.plus(JANELA));
        }
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();

    public LimiteTentativasLogin(Clock clock) {
        this.clock = clock;
    }

    public boolean bloqueado(String email) {
        Janela janela = janelas.get(Emails.normalizar(email));
        return janela != null && janela.vigente(clock.instant()) && janela.falhas() >= MAX_FALHAS;
    }

    public void registrarFalha(String email) {
        Instant agora = clock.instant();
        janelas.compute(Emails.normalizar(email), (chave, atual) ->
                atual == null || !atual.vigente(agora)
                        ? new Janela(agora, 1)
                        : new Janela(atual.inicio(), atual.falhas() + 1));
        if (janelas.size() > LIMITE_PARA_LIMPEZA) {
            janelas.values().removeIf(janela -> !janela.vigente(agora));
        }
    }

    public void registrarSucesso(String email) {
        janelas.remove(Emails.normalizar(email));
    }
}
