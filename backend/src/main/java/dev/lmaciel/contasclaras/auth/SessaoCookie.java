package dev.lmaciel.contasclaras.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Cookie da sessão: HttpOnly, SameSite=Strict, Path=/, 30 dias. {@code Secure} fica ligado, exceto
 * no profile dev ({@code app.cookie.secure=false}).
 */
@Component
public class SessaoCookie {

    public static final String NOME = "cc_session";

    private final boolean secure;

    public SessaoCookie(@Value("${app.cookie.secure:true}") boolean secure) {
        this.secure = secure;
    }

    public ResponseCookie criar(String token) {
        return base(token).maxAge(TokenService.VALIDADE).build();
    }

    public ResponseCookie limpar() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String valor) {
        return ResponseCookie.from(NOME, valor)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/");
    }
}
