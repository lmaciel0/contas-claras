package dev.lmaciel.contasclaras.auth;

import java.util.Optional;

/**
 * Valida o ID token que o Google entrega ao navegador. Vazio quando o token é inválido, expirado,
 * de outro cliente (audience) ou não pôde ser conferido.
 */
public interface GoogleTokenVerifier {

    Optional<IdentidadeGoogle> verificar(String idToken);

    /** Dados do token já validado. {@code sub} é o identificador estável do usuário no Google. */
    record IdentidadeGoogle(String sub, String email, boolean emailVerificado, String nome) {
    }
}
