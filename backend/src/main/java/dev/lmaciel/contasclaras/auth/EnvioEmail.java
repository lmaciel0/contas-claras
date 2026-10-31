package dev.lmaciel.contasclaras.auth;

public interface EnvioEmail {

    /**
     * Envia a mensagem e só volta depois de o servidor aceitá-la.
     *
     * @throws dev.lmaciel.contasclaras.comum.EmailIndisponivelException se não foi possível enviar
     */
    void enviar(MensagemEmail mensagem);
}
