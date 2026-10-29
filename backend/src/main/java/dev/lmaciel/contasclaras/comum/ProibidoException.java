package dev.lmaciel.contasclaras.comum;

/**
 * Operação não permitida para quem a pediu (a API responde 403).
 */
public class ProibidoException extends RuntimeException {

    public ProibidoException(String mensagem) {
        super(mensagem);
    }
}
