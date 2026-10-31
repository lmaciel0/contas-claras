package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;

import org.junit.jupiter.api.Test;

class CodigosEmailTest {

    private static final String SEGREDO = "segredo-falso-so-para-testes-0123456789";

    private final CodigosEmail codigos = new CodigosEmail(SEGREDO);

    @Test
    void codigo_tem_sempre_6_digitos() {
        for (int i = 0; i < 1000; i++) {
            assertThat(codigos.gerarCodigo()).matches("\\d{6}");
        }
    }

    @Test
    void hmac_muda_com_tipo_email_e_codigo() {
        String base = codigos.hmacCodigo(TipoCodigo.CADASTRO, "a@exemplo.com", "123456");

        assertThat(base).hasSize(64).matches("[0-9a-f]{64}");
        assertThat(codigos.hmacCodigo(TipoCodigo.CADASTRO, "a@exemplo.com", "123456")).isEqualTo(base);
        assertThat(codigos.hmacCodigo(TipoCodigo.SENHA, "a@exemplo.com", "123456")).isNotEqualTo(base);
        assertThat(codigos.hmacCodigo(TipoCodigo.CADASTRO, "b@exemplo.com", "123456")).isNotEqualTo(base);
        assertThat(codigos.hmacCodigo(TipoCodigo.CADASTRO, "a@exemplo.com", "654321")).isNotEqualTo(base);
        assertThat(new CodigosEmail(SEGREDO + "-outro").hmacCodigo(TipoCodigo.CADASTRO, "a@exemplo.com", "123456"))
                .isNotEqualTo(base);
    }

    @Test
    void hmac_nao_contem_o_codigo() {
        String hmac = codigos.hmacCodigo(TipoCodigo.SENHA, "a@exemplo.com", "123456");

        assertThat(hmac).doesNotContain("123456").doesNotContain("a@exemplo.com");
    }

    @Test
    void token_tem_ao_menos_43_caracteres_base64url() {
        String token = codigos.gerarToken();

        assertThat(token).hasSizeGreaterThanOrEqualTo(43).matches("[A-Za-z0-9_-]+");
        assertThat(Base64.getUrlDecoder().decode(token)).hasSize(32);
        assertThat(codigos.gerarToken()).isNotEqualTo(token);
    }

    @Test
    void hash_do_token_e_sha256_em_hex_e_nao_contem_o_token() {
        String token = codigos.gerarToken();
        String hash = codigos.hashToken(token);

        assertThat(hash).hasSize(64).matches("[0-9a-f]{64}").doesNotContain(token);
        assertThat(codigos.hashToken(token)).isEqualTo(hash);
        assertThat(codigos.hashToken(codigos.gerarToken())).isNotEqualTo(hash);
    }

    @Test
    void iguais_compara_o_conteudo() {
        assertThat(codigos.iguais("abc", "abc")).isTrue();
        assertThat(codigos.iguais("abc", "abd")).isFalse();
        assertThat(codigos.iguais("abc", "abcd")).isFalse();
    }
}
