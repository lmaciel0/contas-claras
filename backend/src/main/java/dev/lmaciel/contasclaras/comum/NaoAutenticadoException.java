package dev.lmaciel.contasclaras.comum;

/**
 * Credenciais inválidas ou sessão inexistente (a API responde 401).
 */
public class NaoAutenticadoException extends RuntimeException {

    public NaoAutenticadoException(String mensagem) {
        super(mensagem);
    }
}
