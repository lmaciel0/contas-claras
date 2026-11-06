package dev.lmaciel.aprumo.diagnostico;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SaneadorRelatoTest {

    @Test
    void troca_controle_formatacao_e_separadores_de_linha_por_interrogacao() {
        assertThat(SaneadorRelato.texto("a\u001bb\u0085c d‮e\r\nf\tg"))
                .isEqualTo("a?b?c?d?e??f?g");
    }

    @Test
    void troca_separador_de_paragrafo() {
        assertThat(SaneadorRelato.texto("a b")).isEqualTo("a?b");
    }

    @Test
    void email_vira_marcador() {
        assertThat(SaneadorRelato.texto("falha para ana.silva@exemplo.com.br ao salvar"))
                .isEqualTo("falha para [email] ao salvar");
    }

    @Test
    void sequencia_longa_de_letras_digitos_e_traco_vira_token() {
        assertThat(SaneadorRelato.texto("jwt abcdefghijklmnopqrstuvwx_-12 fim"))
                .isEqualTo("jwt [token] fim");
        assertThat(SaneadorRelato.texto("curto abcdefghijklmnopqrstuvw fim"))
                .isEqualTo("curto abcdefghijklmnopqrstuvw fim");
    }

    @Test
    void query_string_e_fragmento_saem_da_mensagem_e_da_pilha() {
        assertThat(SaneadorRelato.texto("GET /api/x?email=a&n=1 falhou")).isEqualTo("GET /api/x falhou");
        assertThat(SaneadorRelato.texto("at f (https://app/x.js?v=1:10:5)")).isEqualTo("at f (https://app/x.js)");
        assertThat(SaneadorRelato.texto("em /tela#segredo ok")).isEqualTo("em /tela ok");
    }

    @Test
    void query_e_removida_antes_de_trocar_controle_por_interrogacao() {
        assertThat(SaneadorRelato.texto("a\u001b[31mb")).isEqualTo("a?[31mb");
    }

    @Test
    void nulo_vira_vazio() {
        assertThat(SaneadorRelato.texto(null)).isEmpty();
    }

    @Test
    void rota_troca_segmentos_numericos_por_id() {
        assertThat(SaneadorRelato.rota("/lancamentos/123/editar")).isEqualTo("/lancamentos/:id/editar");
        assertThat(SaneadorRelato.rota("/itens/7")).isEqualTo("/itens/:id");
        assertThat(SaneadorRelato.rota("/a/12b/9")).isEqualTo("/a/12b/:id");
    }

    @Test
    void rota_tambem_perde_token_email_e_controle() {
        assertThat(SaneadorRelato.rota("/r/abcdefghijklmnopqrstuvwxyz0123/x")).isEqualTo("/r/[token]/x");
        assertThat(SaneadorRelato.rota("/a\u0085b")).isEqualTo("/a?b");
    }

    @Test
    void aspas_e_barra_sao_escapadas() {
        assertThat(SaneadorRelato.escapar("diz \"oi\" \\ fim")).isEqualTo("diz \\\"oi\\\" \\\\ fim");
    }
}
