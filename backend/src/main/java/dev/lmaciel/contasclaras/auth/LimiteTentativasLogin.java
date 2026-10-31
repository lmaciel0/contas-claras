package dev.lmaciel.contasclaras.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.stereotype.Component;

/**
 * Deixa passar no máximo 5 tentativas de login por e-mail dentro de 15 minutos. A tentativa é
 * reservada antes de conferir a senha (de forma atômica), então uma rajada de requisições paralelas
 * não consegue ultrapassar o limite enquanto o BCrypt ainda roda. Login certo zera o contador.
 *
 * <p>Fica em memória: a API roda em uma única instância e o contador zera se ela reiniciar, o que é
 * aceitável para este uso. Conta também e-mails que não existem, para não revelar quais têm conta.
 */
@Component
public class LimiteTentativasLogin {

    static final int MAX_TENTATIVAS = 5;
    static final Duration JANELA = Duration.ofMinutes(15);
    /** Acima disso, janelas vencidas são varridas para o mapa não crescer sem limite. */
    private static final int LIMITE_PARA_LIMPEZA = 10_000;

    private record Janela(Instant inicio, int tentativas) {

        boolean vigente(Instant agora) {
            return agora.isBefore(inicio.plus(JANELA));
        }
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();

    public LimiteTentativasLogin(Clock clock) {
        this.clock = clock;
    }

    /**
     * Reserva uma tentativa para o e-mail.
     *
     * @return {@code true} se a tentativa pode seguir; {@code false} se o limite da janela já foi atingido
     *         (nesse caso nada é contado, então o bloqueio não é prorrogado)
     */
    public boolean reservarTentativa(String email) {
        Instant agora = clock.instant();
        AtomicBoolean liberada = new AtomicBoolean();
        janelas.compute(Emails.normalizar(email), (chave, atual) -> {
            if (atual == null || !atual.vigente(agora)) {
                liberada.set(true);
                return new Janela(agora, 1);
            }
            if (atual.tentativas() >= MAX_TENTATIVAS) {
                return atual;
            }
            liberada.set(true);
            return new Janela(atual.inicio(), atual.tentativas() + 1);
        });
        if (janelas.size() > LIMITE_PARA_LIMPEZA) {
            janelas.values().removeIf(janela -> !janela.vigente(agora));
        }
        return liberada.get();
    }

    public void registrarSucesso(String email) {
        janelas.remove(Emails.normalizar(email));
    }
}
