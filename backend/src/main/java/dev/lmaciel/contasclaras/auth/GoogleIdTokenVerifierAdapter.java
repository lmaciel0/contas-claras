package dev.lmaciel.contasclaras.auth;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

/**
 * Valida o ID token com a biblioteca do Google: assinatura (chaves públicas do Google, em cache),
 * emissor, expiração e audience igual ao {@code GOOGLE_CLIENT_ID}. Sem client ID configurado nenhum
 * token é aceito.
 */
@Component
class GoogleIdTokenVerifierAdapter implements GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenVerifierAdapter.class);

    private final GoogleIdTokenVerifier verificador;

    GoogleIdTokenVerifierAdapter(@Value("${app.google.client-id:}") String clientId) {
        this.verificador = StringUtils.hasText(clientId)
                // Timeout padrão da biblioteca (20 s) aceito de propósito: as chaves do Google ficam em cache
                // e são buscadas raramente, então um transporte próprio custaria mais que o risco.
                ? new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(List.of(clientId.trim()))
                        .build()
                : null;
        if (verificador == null) {
            log.warn("GOOGLE_CLIENT_ID não configurado: o login com Google está desligado.");
        }
    }

    @Override
    public Optional<IdentidadeGoogle> verificar(String idToken) {
        if (verificador == null) {
            return Optional.empty();
        }
        try {
            GoogleIdToken token = verificador.verify(idToken);
            return Optional.ofNullable(token).map(GoogleIdToken::getPayload).map(GoogleIdTokenVerifierAdapter::identidade);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            // Token malformado ou Google fora do ar: nega o login. Nunca registra o token.
            log.warn("Não foi possível validar o token do Google ({}).", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static IdentidadeGoogle identidade(Payload payload) {
        Object nome = payload.get("name");
        return new IdentidadeGoogle(
                payload.getSubject(),
                payload.getEmail(),
                Boolean.TRUE.equals(payload.getEmailVerified()),
                nome instanceof String texto ? texto : null);
    }
}
