package dev.lmaciel.contasclaras.comum;

/**
 * Regra de entrada que a validação declarativa não cobre (a API responde 400).
 */
public class RequisicaoInvalidaException extends RuntimeException {

    public RequisicaoInvalidaException(String mensagem) {
        super(mensagem);
    }
}
