package dev.lmaciel.contasclaras.auth;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * Rejeita o token se o usuário não existe mais, se o {@code sub} não é um id, ou se a claim
 * {@code ver} não é igual à {@code sessao_versao} atual do usuário (trocar a senha invalida os
 * cookies antigos). Custa uma consulta por requisição autenticada, o que é aceitável aqui.
 */
final class SessaoVersaoValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2TokenValidatorResult INVALIDO = OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Sessão inválida.", null));

    private final UsuarioRepository usuarios;

    SessaoVersaoValidator(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Long id = idDoUsuario(jwt.getSubject());
        Object versao = jwt.getClaims().get(TokenService.CLAIM_VERSAO);
        if (id == null || !(versao instanceof Number numero)) {
            return INVALIDO;
        }
        boolean confere = usuarios.buscarSessaoVersao(id)
                .map(atual -> atual.longValue() == numero.longValue())
                .orElse(false);
        return confere ? OAuth2TokenValidatorResult.success() : INVALIDO;
    }

    private static Long idDoUsuario(String sub) {
        try {
            return sub == null ? null : Long.valueOf(sub);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
