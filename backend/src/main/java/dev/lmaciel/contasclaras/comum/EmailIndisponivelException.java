package dev.lmaciel.contasclaras.comum;

/**
 * Não foi possível enviar o e-mail (SMTP desligado ou com falha). A API responde 503.
 */
public class EmailIndisponivelException extends RuntimeException {

    public EmailIndisponivelException() {
        super("Não foi possível enviar o e-mail. Tente de novo.");
    }

    public EmailIndisponivelException(Throwable causa) {
        super("Não foi possível enviar o e-mail. Tente de novo.", causa);
    }
}
