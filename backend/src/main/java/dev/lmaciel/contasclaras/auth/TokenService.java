package dev.lmaciel.contasclaras.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import dev.lmaciel.contasclaras.usuario.Usuario;

/**
 * Emite o JWT da sessão (HS256, {@code sub} = id do usuário, {@code ver} = versão da sessão, 30 dias). A validação é feita
 * pelo resource server com a mesma chave (ver {@link SecurityConfig}).
 */
@Service
public class TokenService {

    public static final Duration VALIDADE = Duration.ofDays(30);
    /** Claim com a versão da sessão do usuário no momento da emissão. */
    static final String CLAIM_VERSAO = "ver";

    private static final int MIN_BYTES_SEGREDO = 32;

    private final JwtEncoder encoder;
    private final Clock clock;

    public TokenService(@Value("${app.jwt.secret}") String segredo, Clock clock) {
        this.encoder = NimbusJwtEncoder.withSecretKey(chave(segredo)).build();
        this.clock = clock;
    }

    public String emitir(Usuario usuario) {
        return emitir(usuario.getId(), usuario.getSessaoVersao());
    }

    public String emitir(long usuarioId, int sessaoVersao) {
        Instant agora = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(usuarioId))
                .claim(CLAIM_VERSAO, sessaoVersao)
                .issuedAt(agora)
                .expiresAt(agora.plus(VALIDADE))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    static SecretKey chave(String segredo) {
        byte[] bytes = segredo == null ? new byte[0] : segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_BYTES_SEGREDO) {
            throw new IllegalStateException("JWT_SECRET precisa ter pelo menos " + MIN_BYTES_SEGREDO + " bytes.");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
