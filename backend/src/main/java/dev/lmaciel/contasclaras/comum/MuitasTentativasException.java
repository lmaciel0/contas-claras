package dev.lmaciel.contasclaras.comum;

/**
 * Limite de tentativas excedido (a API responde 429).
 */
public class MuitasTentativasException extends RuntimeException {

    public MuitasTentativasException() {
        super("Muitas tentativas. Tente de novo em alguns minutos.");
    }
}
