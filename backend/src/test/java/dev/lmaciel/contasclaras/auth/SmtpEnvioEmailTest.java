package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import dev.lmaciel.contasclaras.CapturaLog;
import dev.lmaciel.contasclaras.comum.EmailIndisponivelException;
import jakarta.mail.Address;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

class SmtpEnvioEmailTest {

    private static final MensagemEmail MENSAGEM = new MensagemEmail("ana@exemplo.com", "Assunto de teste",
            "Texto com código 042917 e acentuação.", "<p>Html com código 042917 e acentuação.</p>");

    private JavaMailSender mailSender;

    @BeforeEach
    void preparar() {
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenAnswer(i -> new MimeMessage((Session) null));
    }

    @Test
    void sem_usuario_configurado_lanca_email_indisponivel() {
        for (String vazio : new String[] { "", "   ", null }) {
            SmtpEnvioEmail envio = new SmtpEnvioEmail(mailSender, vazio);

            assertThatThrownBy(() -> envio.enviar(MENSAGEM)).isInstanceOf(EmailIndisponivelException.class);
        }
        verifyNoInteractions(mailSender);
    }

    @Test
    void sem_usuario_configurado_registra_aviso_na_subida_sem_dados_sensiveis() {
        for (String vazio : new String[] { "", "   ", null }) {
            try (CapturaLog captura = CapturaLog.de(SmtpEnvioEmail.class)) {
                new SmtpEnvioEmail(mailSender, vazio);

                assertThat(captura.eventos()).hasSize(1);
                ILoggingEvent aviso = captura.eventos().get(0);
                assertThat(aviso.getLevel()).isEqualTo(Level.WARN);
                assertThat(aviso.getFormattedMessage()).contains("MAIL_USERNAME").contains("503");
            }
        }
    }

    @Test
    void com_usuario_configurado_nao_registra_aviso_na_subida() {
        try (CapturaLog captura = CapturaLog.de(SmtpEnvioEmail.class)) {
            new SmtpEnvioEmail(mailSender, "contas@exemplo.com");

            assertThat(captura.eventos()).isEmpty();
        }
    }

    @Test
    void falha_do_mail_sender_vira_email_indisponivel() {
        doThrow(new MailSendException("falhou")).when(mailSender).send(any(MimeMessage.class));
        SmtpEnvioEmail envio = new SmtpEnvioEmail(mailSender, "contas@exemplo.com");

        assertThatThrownBy(() -> envio.enviar(MENSAGEM))
                .isInstanceOf(EmailIndisponivelException.class)
                .hasMessage("Não foi possível enviar o e-mail. Tente de novo.");
    }

    @Test
    void envia_multipart_com_texto_e_html_e_remetente_contas_claras() throws Exception {
        new SmtpEnvioEmail(mailSender, "contas@exemplo.com").enviar(MENSAGEM);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage enviada = captor.getValue();
        enviada.saveChanges(); // o JavaMailSender real faz isso; é o que define o Content-Type

        Address[] de = enviada.getFrom();
        assertThat(de).hasSize(1);
        InternetAddress remetente = (InternetAddress) de[0];
        assertThat(remetente.getAddress()).isEqualTo("contas@exemplo.com");
        assertThat(remetente.getPersonal()).isEqualTo("Contas Claras");
        assertThat(enviada.getAllRecipients()).hasSize(1);
        assertThat(((InternetAddress) enviada.getAllRecipients()[0]).getAddress()).isEqualTo("ana@exemplo.com");
        assertThat(enviada.getSubject()).isEqualTo("Assunto de teste");

        assertThat(enviada.isMimeType("multipart/*")).isTrue();
        List<String> textos = new ArrayList<>();
        List<String> htmls = new ArrayList<>();
        coletar(enviada, textos, htmls);
        assertThat(textos).containsExactly(MENSAGEM.texto());
        assertThat(htmls).containsExactly(MENSAGEM.html());
    }

    private static void coletar(Part parte, List<String> textos, List<String> htmls) throws Exception {
        if (parte.isMimeType("multipart/*")) {
            Multipart multi = (Multipart) parte.getContent();
            for (int i = 0; i < multi.getCount(); i++) {
                coletar(multi.getBodyPart(i), textos, htmls);
            }
        } else if (parte.isMimeType("text/plain")) {
            textos.add((String) parte.getContent());
        } else if (parte.isMimeType("text/html")) {
            htmls.add((String) parte.getContent());
        }
    }
}
