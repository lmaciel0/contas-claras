package dev.lmaciel.contasclaras.auth;

/** E-mail pronto para envio, em texto puro e em HTML. */
public record MensagemEmail(String para, String assunto, String texto, String html) {
}
