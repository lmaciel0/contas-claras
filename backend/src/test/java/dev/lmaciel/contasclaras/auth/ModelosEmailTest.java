package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ModelosEmailTest {

    private static final String APP_URL = "https://contas.exemplo.com";
    private static final String AVISO = "Se não foi você, ignore este e-mail";

    private final ModelosEmail modelos = new ModelosEmail(APP_URL);

    @Test
    void cadastro_traz_codigo_link_validade_e_aviso() {
        MensagemEmail m = modelos.codigoCadastro("ana@exemplo.com", "Ana", "042917", "token-abc_123");

        assertThat(m.para()).isEqualTo("ana@exemplo.com");
        for (String corpo : new String[] { m.texto(), m.html() }) {
            assertThat(corpo).contains("042917")
                    .contains(APP_URL + "/confirmar?token=token-abc_123")
                    .contains("15 minutos")
                    .contains(AVISO);
        }
    }

    @Test
    void assunto_nunca_contem_o_codigo() {
        assertThat(modelos.codigoCadastro("ana@exemplo.com", "Ana", "042917", "tk").assunto())
                .isNotBlank().doesNotContain("042917");
        assertThat(modelos.codigoSenha("ana@exemplo.com", "042917").assunto())
                .isNotBlank().doesNotContain("042917");
    }

    @Test
    void codigo_de_senha_traz_codigo_validade_e_aviso() {
        MensagemEmail m = modelos.codigoSenha("ana@exemplo.com", "042917");

        for (String corpo : new String[] { m.texto(), m.html() }) {
            assertThat(corpo).contains("042917").contains("15 minutos").contains(AVISO);
        }
    }

    @Test
    void conta_ja_existe_aponta_para_esqueci_a_senha() {
        MensagemEmail m = modelos.contaJaExiste("ana@exemplo.com");

        assertThat(m.para()).isEqualTo("ana@exemplo.com");
        assertThat(m.assunto()).isNotBlank();
        for (String corpo : new String[] { m.texto(), m.html() }) {
            assertThat(corpo).contains("Esqueci a senha").contains(APP_URL + "/esqueci-senha").contains(AVISO);
        }
    }

    @Test
    void sem_conta_nao_traz_codigo() {
        MensagemEmail m = modelos.semConta("ana@exemplo.com");

        assertThat(m.para()).isEqualTo("ana@exemplo.com");
        assertThat(m.assunto()).isNotBlank();
        for (String corpo : new String[] { m.texto(), m.html() }) {
            assertThat(corpo).doesNotContainPattern("\\d{6}").contains(APP_URL + "/cadastro").contains(AVISO);
        }
    }

    @Test
    void nome_e_escapado_no_html_e_fica_intacto_no_texto() {
        MensagemEmail m = modelos.codigoCadastro("ana@exemplo.com", "<b>&", "042917", "tk");

        assertThat(m.html()).contains("&lt;b&gt;&amp;").doesNotContain("<b>&");
        assertThat(m.texto()).contains("<b>&");
    }
}
