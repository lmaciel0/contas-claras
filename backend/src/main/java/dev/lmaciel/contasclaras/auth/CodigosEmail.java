package dev.lmaciel.contasclaras.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Gera e protege os segredos dos e-mails: código de 6 dígitos, token do link e os HMACs gravados no banco.
 * A chave do HMAC deriva de {@code app.jwt.secret} (HMAC-SHA256 do rótulo {@code codigo-email}), para o
 * mesmo segredo não servir a dois usos. Todas as saídas em hash são hexadecimais de 64 caracteres.
 */
@Component
public class CodigosEmail {

    private static final String HMAC = "HmacSHA256";
    private static final int BYTES_TOKEN = 32;

    private final SecureRandom aleatorio = new SecureRandom();
    private final SecretKey chave;

    public CodigosEmail(@Value("${app.jwt.secret}") String segredo) {
        byte[] derivada = hmac(TokenService.chave(segredo), "codigo-email");
        this.chave = new SecretKeySpec(derivada, HMAC);
    }

    /** Seis dígitos de {@link SecureRandom}, com zeros à esquerda. */
    public String gerarCodigo() {
        return String.format("%06d", aleatorio.nextInt(1_000_000));
    }

    /** HMAC de {@code tipo|email|codigo}: o código não vale para outro tipo nem para outro e-mail. */
    public String hmacCodigo(TipoCodigo tipo, String email, String codigo) {
        return hmac(tipo.name() + "|" + email + "|" + codigo);
    }

    /** 32 bytes aleatórios em base64url, sem preenchimento (43 caracteres). */
    public String gerarToken() {
        byte[] bytes = new byte[BYTES_TOKEN];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 do token em hexadecimal; é o que fica no banco. */
    public String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível.", e);
        }
    }

    /** HMAC-SHA256 do valor, em hexadecimal. Serve também para guardar e-mail e IP sem expô-los. */
    public String hmac(String valor) {
        return HexFormat.of().formatHex(hmac(chave, valor));
    }

    /** Comparação em tempo constante. */
    public boolean iguais(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] hmac(SecretKey chave, String valor) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(chave);
            return mac.doFinal(valor.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 indisponível.", e);
        }
    }
}
