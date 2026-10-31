package dev.lmaciel.contasclaras.auth;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.context.annotation.Primary;

import dev.lmaciel.contasclaras.comum.EmailIndisponivelException;

/**
 * Envio de e-mail dos testes de integração: guarda as mensagens em memória em vez de falar com um SMTP.
 * Entra pelo {@code @Import} de {@code IntegracaoTest} e vence o envio real por ser {@code @Primary}.
 * Sem estereótipo de propósito, para a varredura de componentes não o pegar em outros contextos.
 */
@Primary
public class EnvioEmailFalso implements EnvioEmail {

    private final List<MensagemEmail> enviadas = new CopyOnWriteArrayList<>();
    private final AtomicBoolean falharNoProximo = new AtomicBoolean();

    @Override
    public void enviar(MensagemEmail mensagem) {
        if (falharNoProximo.getAndSet(false)) {
            throw new EmailIndisponivelException();
        }
        enviadas.add(mensagem);
    }

    public List<MensagemEmail> enviadas() {
        return List.copyOf(enviadas);
    }

    /** Faz só o próximo {@link #enviar} lançar {@link EmailIndisponivelException}. */
    public void falharNoProximo() {
        falharNoProximo.set(true);
    }

    /** Esvazia as mensagens e cancela uma falha pendente. */
    public void limpar() {
        enviadas.clear();
        falharNoProximo.set(false);
    }
}
