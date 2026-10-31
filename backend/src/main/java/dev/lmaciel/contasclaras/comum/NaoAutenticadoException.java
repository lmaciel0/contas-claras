package dev.lmaciel.contasclaras.comum;

/**
 * Credenciais inválidas ou sessão inexistente (a API responde 401).
 */
public class NaoAutenticadoException extends RuntimeException {

    /** Mensagem única para "sem sessão válida", usada também pelo filtro de segurança. */
    public static final String MENSAGEM = "Não autenticado.";

    public NaoAutenticadoException() {
        super(MENSAGEM);
    }

    public NaoAutenticadoException(String mensagem) {
        super(mensagem);
    }
}
