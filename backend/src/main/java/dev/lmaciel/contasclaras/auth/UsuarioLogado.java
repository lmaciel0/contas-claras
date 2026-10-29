package dev.lmaciel.contasclaras.auth;

import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Usuário da sessão atual. Nos controllers: {@code UsuarioLogado.de(jwt)} com
 * {@code @AuthenticationPrincipal Jwt jwt}.
 */
public record UsuarioLogado(long id) {

    public static UsuarioLogado de(Jwt jwt) {
        return new UsuarioLogado(Long.parseLong(jwt.getSubject()));
    }
}
