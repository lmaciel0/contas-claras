package dev.lmaciel.contasclaras.auth;

import java.io.UnsupportedEncodingException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import dev.lmaciel.contasclaras.comum.EmailIndisponivelException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Envio real por SMTP, com texto e HTML. Fora do perfil {@code dev}. Sem {@code MAIL_USERNAME} o envio fica
 * desligado. Nenhum log leva destinatário, assunto ou conteúdo, nem a mensagem da exceção (que pode citar o
 * endereço): só o tipo da falha.
 */
@Component
@Profile("!dev")
public class SmtpEnvioEmail implements EnvioEmail {

    private static final Logger log = LoggerFactory.getLogger(SmtpEnvioEmail.class);

    private static final String AVISO_DESLIGADO = "Envio de e-mail desligado: MAIL_USERNAME não está configurado.";
    private static final String NOME_REMETENTE = "Contas Claras";

    private final JavaMailSender mailSender;
    private final String remetente;

    public SmtpEnvioEmail(JavaMailSender mailSender, @Value("${spring.mail.username:}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
        if (remetente == null || remetente.isBlank()) {
            // A API sobe mesmo assim; quem pedir e-mail recebe 503. O aviso na subida evita descobrir só no primeiro envio.
            log.warn("{} Os pedidos que enviam e-mail responderão 503 até configurar.", AVISO_DESLIGADO);
        }
    }

    @Override
    public void enviar(MensagemEmail mensagem) {
        if (remetente == null || remetente.isBlank()) {
            log.warn(AVISO_DESLIGADO);
            throw new EmailIndisponivelException();
        }
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(remetente, NOME_REMETENTE);
            helper.setTo(mensagem.para());
            helper.setSubject(mensagem.assunto());
            helper.setText(mensagem.texto(), mensagem.html());
            mailSender.send(mime);
        } catch (MailException | MessagingException | UnsupportedEncodingException e) {
            log.warn("Falha ao enviar e-mail: {}", e.getClass().getSimpleName());
            throw new EmailIndisponivelException(e);
        }
    }
}
