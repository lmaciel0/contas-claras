package dev.lmaciel.contasclaras.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Envio de desenvolvimento: escreve o e-mail no log, com código e link, para quem roda local não precisar de SMTP.
 * Só existe no perfil {@code dev}; em produção, código e link nunca vão para o log.
 */
@Component
@Profile("dev")
public class ConsoleEnvioEmail implements EnvioEmail {

    private static final Logger log = LoggerFactory.getLogger(ConsoleEnvioEmail.class);

    @Override
    public void enviar(MensagemEmail mensagem) {
        log.info("E-mail (dev, não enviado) para {}\nAssunto: {}\n{}", mensagem.para(), mensagem.assunto(),
                mensagem.texto());
    }
}
