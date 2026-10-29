package dev.lmaciel.contasclaras.comum;

/**
 * Recurso inexistente ou de outro usuário (a API responde 404 nos dois casos).
 */
public class NaoEncontradoException extends RuntimeException {

    public NaoEncontradoException() {
        super("Não encontrado");
    }

    public NaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
