package dev.lmaciel.contasclaras.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Textos dos e-mails. Os assuntos nunca levam o código, porque aparecem em notificações na tela bloqueada.
 * Só o {@code nome} vem de entrada externa e é escapado no HTML; código e token têm alfabeto fixo
 * (dígitos e base64url).
 */
@Component
public class ModelosEmail {

    private static final String AVISO = "Se não foi você, ignore este e-mail.";
    private static final String VALIDADE = "15 minutos";

    private final String appUrl;

    public ModelosEmail(@Value("${app.url}") String appUrl) {
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    public MensagemEmail codigoCadastro(String para, String nome, String codigo, String token) {
        String link = appUrl + "/confirmar?token=" + token;
        String texto = """
                Olá, %s!

                Seu código para confirmar o e-mail no Contas Claras é: %s

                Ou abra este link e confirme: %s

                Você vai definir a sua senha ao confirmar.

                O código e o link valem por %s e só podem ser usados uma vez.

                %s
                """.formatted(nome, codigo, link, VALIDADE, AVISO);
        String html = pagina("""
                <p>Olá, %s!</p>
                <p>Seu código para confirmar o e-mail no Contas Claras é:</p>
                <p style="font-size:28px;font-weight:bold;letter-spacing:4px">%s</p>
                <p>Ou <a href="%s">abra este link</a> e confirme.</p>
                <p>Você vai definir a sua senha ao confirmar.</p>
                <p>O código e o link valem por %s e só podem ser usados uma vez.</p>
                <p>%s</p>
                """.formatted(escapar(nome), codigo, link, VALIDADE, AVISO));
        return new MensagemEmail(para, "Confirme seu e-mail no Contas Claras", texto, html);
    }

    public MensagemEmail contaJaExiste(String para) {
        String texto = """
                Alguém pediu para criar uma conta no Contas Claras com este e-mail, mas ele já tem conta.

                Entre com a sua senha. Se não lembra, use "Esqueci a senha": %s

                %s
                """.formatted(appUrl + "/esqueci-senha", AVISO);
        String html = pagina("""
                <p>Alguém pediu para criar uma conta no Contas Claras com este e-mail, mas ele já tem conta.</p>
                <p>Entre com a sua senha. Se não lembra, use <a href="%s">"Esqueci a senha"</a>.</p>
                <p>%s</p>
                """.formatted(appUrl + "/esqueci-senha", AVISO));
        return new MensagemEmail(para, "Você já tem conta no Contas Claras", texto, html);
    }

    public MensagemEmail codigoSenha(String para, String codigo) {
        String texto = """
                Seu código para redefinir a senha do Contas Claras é: %s

                O código vale por %s e só pode ser usado uma vez.

                %s
                """.formatted(codigo, VALIDADE, AVISO);
        String html = pagina("""
                <p>Seu código para redefinir a senha do Contas Claras é:</p>
                <p style="font-size:28px;font-weight:bold;letter-spacing:4px">%s</p>
                <p>O código vale por %s e só pode ser usado uma vez.</p>
                <p>%s</p>
                """.formatted(codigo, VALIDADE, AVISO));
        return new MensagemEmail(para, "Redefinição de senha no Contas Claras", texto, html);
    }

    public MensagemEmail semConta(String para) {
        String texto = """
                Alguém pediu para redefinir a senha do Contas Claras com este e-mail, mas não há conta com ele.

                Para criar uma conta, acesse %s

                %s
                """.formatted(appUrl + "/cadastro", AVISO);
        String html = pagina("""
                <p>Alguém pediu para redefinir a senha do Contas Claras com este e-mail, mas não há conta com ele.</p>
                <p>Para criar uma conta, acesse <a href="%s">%s</a>.</p>
                <p>%s</p>
                """.formatted(appUrl + "/cadastro", appUrl + "/cadastro", AVISO));
        return new MensagemEmail(para, "Redefinição de senha no Contas Claras", texto, html);
    }

    private static String escapar(String valor) {
        return HtmlUtils.htmlEscape(valor, "UTF-8");
    }

    private static String pagina(String corpo) {
        return "<!DOCTYPE html><html lang=\"pt-BR\"><body style=\"font-family:sans-serif;color:#222\">"
                + corpo + "</body></html>";
    }
}
