package dev.lmaciel.aprumo.diagnostico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.aprumo.IntegracaoTest;

/**
 * O limite fica em memória e vale para a JVM inteira dos testes, então cada teste usa um IP só dele.
 * Sem segredo de origem, o cliente é o 2º item da direita do X-Forwarded-For ("cliente, borda").
 */
@ExtendWith(OutputCaptureExtension.class)
class DiagnosticoControllerTest extends IntegracaoTest {

    private static final AtomicInteger SEQUENCIA = new AtomicInteger();

    @Autowired
    JdbcTemplate jdbc;

    private static String ipNovo() {
        return "198.51.100." + SEQUENCIA.incrementAndGet();
    }

    private ResultActions relatar(String ip, String json) throws Exception {
        return mvc.perform(post("/api/diagnostico/erros")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", ip + ", 203.0.113.60")
                .content(json));
    }

    private static String corpo(String mensagem, String pilha, String rota) {
        return """
                {"mensagem":"%s","pilha":"%s","rota":"%s"}""".formatted(mensagem, pilha, rota);
    }

    @Test
    void sem_sessao_e_com_corpo_valido_responde_204() throws Exception {
        relatar(ipNovo(), corpo("falhou", "Error: falhou\\n at x", "/lancamentos"))
                .andExpect(status().isNoContent());
    }

    @Test
    void pilha_e_opcional() throws Exception {
        relatar(ipNovo(), "{\"mensagem\":\"falhou\",\"rota\":\"/\"}").andExpect(status().isNoContent());
    }

    @Test
    void rota_com_query_string_e_recusada() throws Exception {
        relatar(ipNovo(), corpo("falhou", "", "/lancamentos?email=a@b.com")).andExpect(status().isBadRequest());
    }

    @Test
    void rota_com_fragmento_ou_sem_barra_inicial_e_recusada() throws Exception {
        relatar(ipNovo(), corpo("falhou", "", "/lancamentos#x")).andExpect(status().isBadRequest());
        relatar(ipNovo(), corpo("falhou", "", "lancamentos")).andExpect(status().isBadRequest());
    }

    @Test
    void mensagem_acima_de_500_e_recusada() throws Exception {
        relatar(ipNovo(), corpo("a".repeat(501), "", "/")).andExpect(status().isBadRequest());
    }

    @Test
    void mensagem_em_branco_e_recusada() throws Exception {
        relatar(ipNovo(), corpo("  ", "", "/")).andExpect(status().isBadRequest());
    }

    @Test
    void pilha_acima_de_4000_e_recusada() throws Exception {
        relatar(ipNovo(), corpo("falhou", "a".repeat(4001), "/")).andExpect(status().isBadRequest());
    }

    @Test
    void o_21o_pedido_do_mesmo_ip_responde_429() throws Exception {
        String ip = ipNovo();
        for (int i = 0; i < 20; i++) {
            relatar(ip, corpo("falhou", "", "/")).andExpect(status().isNoContent());
        }
        relatar(ip, corpo("falhou", "", "/")).andExpect(status().isTooManyRequests());
        relatar(ipNovo(), corpo("falhou", "", "/")).andExpect(status().isNoContent());
    }

    @Test
    void pedido_invalido_nao_gasta_o_limite() throws Exception {
        String ip = ipNovo();
        for (int i = 0; i < 25; i++) {
            relatar(ip, corpo("", "", "/")).andExpect(status().isBadRequest());
        }
        relatar(ip, corpo("falhou", "", "/")).andExpect(status().isNoContent());
    }

    @Test
    void quebra_de_linha_na_mensagem_e_na_pilha_nao_gera_linha_nova_no_log(CapturedOutput saida) throws Exception {
        relatar(ipNovo(), corpo("primeira\\r\\nWARN linha-forjada", "pilha\\nOUTRA-FORJADA", "/forjar"))
                .andExpect(status().isNoContent());

        assertThat(saida.getAll())
                .contains("erro no front rota=\"/forjar\" mensagem=\"primeira??WARN linha-forjada\" "
                        + "pilha=\"pilha?OUTRA-FORJADA\"");
        assertThat(saida.getAll().lines())
                .noneMatch(linha -> linha.startsWith("WARN linha-forjada") || linha.startsWith("OUTRA-FORJADA"));
    }

    @Test
    void esc_nel_separador_de_linha_e_bidi_viram_interrogacao_no_log(CapturedOutput saida) throws Exception {
        relatar(ipNovo(), corpo("a\\u001bb\\u0085c\\u2028d\\u202ee", "", "/controles"))
                .andExpect(status().isNoContent());

        assertThat(saida.getAll()).contains("rota=\"/controles\" mensagem=\"a?b?c?d?e\"");
    }

    @Test
    void aspas_na_mensagem_sao_escapadas_e_nao_forjam_outro_campo(CapturedOutput saida) throws Exception {
        relatar(ipNovo(), corpo("x\\\" pilha=\\\"forjada", "real", "/aspas")).andExpect(status().isNoContent());

        assertThat(saida.getAll())
                .contains("mensagem=\"x\\\" pilha=\\\"forjada\" pilha=\"real\"");
    }

    @Test
    void servidor_limpa_email_token_query_e_id_da_rota_mesmo_que_o_cliente_nao_limpe(CapturedOutput saida)
            throws Exception {
        relatar(ipNovo(), corpo("falha de ana@exemplo.com em /x?a=1",
                "at f (https://app/x.js?token=segredo:1:1) abcdefghijklmnopqrstuvwxyz012345", "/itens/42/editar"))
                .andExpect(status().isNoContent());

        String linha = saida.getAll().lines().filter(l -> l.contains("rota=\"/itens/:id/editar\"")).findFirst()
                .orElseThrow();
        assertThat(linha).contains("mensagem=\"falha de [email] em /x\"")
                .contains("pilha=\"at f (https://app/x.js) [token]\"")
                .doesNotContain("ana@").doesNotContain("segredo").doesNotContain("abcdefghijklmnop");
    }

    @Test
    void pilha_e_cortada_em_1000_caracteres_no_log(CapturedOutput saida) throws Exception {
        relatar(ipNovo(), corpo("corte", "ab ".repeat(1000), "/corte")).andExpect(status().isNoContent());

        String linha = saida.getAll().lines().filter(l -> l.contains("rota=\"/corte\"")).findFirst().orElseThrow();
        int inicio = linha.indexOf("pilha=\"") + "pilha=\"".length();
        String pilha = linha.substring(inicio, linha.lastIndexOf('"'));
        assertThat(pilha).hasSize(1000);
    }

    @Test
    void nao_loga_ip_e_nao_grava_no_banco(CapturedOutput saida) throws Exception {
        String ip = ipNovo();
        int usuariosAntes = jdbc.queryForObject("select count(*) from usuario", Integer.class);

        relatar(ip, corpo("sem-ip", "", "/privacidade")).andExpect(status().isNoContent());

        String linha = saida.getAll().lines().filter(l -> l.contains("rota=\"/privacidade\"")).findFirst()
                .orElseThrow();
        assertThat(linha).doesNotContain(ip).doesNotContain("203.0.113.60");
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(usuariosAntes);
    }

    @Test
    void corpo_com_content_length_acima_de_16_kb_responde_413() throws Exception {
        relatar(ipNovo(), corpo("falhou", "a".repeat(20_000), "/")).andExpect(status().isPayloadTooLarge());
    }

    @Test
    void cookie_de_sessao_vencido_ou_invalido_nao_impede_o_relato() throws Exception {
        mvc.perform(post("/api/diagnostico/erros")
                .contentType(MediaType.APPLICATION_JSON)
                .cookie(new jakarta.servlet.http.Cookie("cc_session", "lixo"))
                .header("X-Forwarded-For", ipNovo() + ", 203.0.113.60")
                .content(corpo("falhou", "", "/")))
                .andExpect(status().isNoContent());
    }

    @Test
    void so_aceita_json() throws Exception {
        mvc.perform(post("/api/diagnostico/erros")
                .contentType(MediaType.TEXT_PLAIN)
                .header("X-Forwarded-For", ipNovo() + ", 203.0.113.60")
                .content(corpo("falhou", "", "/")))
                .andExpect(status().isUnsupportedMediaType());
    }
}
