package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.filter.ForwardedHeaderFilter;

import dev.lmaciel.aprumo.IntegracaoTest;

/**
 * O limite por IP usa {@link IpDoCliente}, que lê o {@code X-Forwarded-For} cru contando da direita. O Boot não
 * pode reescrever o endereço (estratégia {@code framework}): o IP mais à esquerda é forjável. Os testes passam
 * pela cadeia de filtros do MockMvc, com um segredo de origem falso.
 */
@TestPropertySource(properties = "aprumo.proxy.segredo-origem=" + IpAtrasDoProxyTest.SEGREDO_TESTE)
class IpAtrasDoProxyTest extends IntegracaoTest {

    static final String SEGREDO_TESTE = "segredo-de-origem-falso-so-para-testes";

    private static final String IP_A = "198.51.100.10";
    private static final String IP_B = "198.51.100.20";
    private static final String VERCEL = "203.0.113.50";
    private static final String BORDA = "203.0.113.60";

    @Autowired
    ApplicationContext contexto;

    @Autowired
    Environment ambiente;

    private ResultActions esqueci(String email, String xForwardedFor, String origem) throws Exception {
        var pedido = post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email));
        if (xForwardedFor != null) {
            pedido.header("X-Forwarded-For", xForwardedFor);
        }
        if (origem != null) {
            pedido.header("X-Aprumo-Origem", origem);
        }
        return mvc.perform(pedido);
    }

    private ResultActions cadastro(String email, String xForwardedFor) throws Exception {
        return mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", xForwardedFor)
                .content("{\"nome\":\"Pessoa\",\"email\":\"%s\"}".formatted(email)));
    }

    private void esgotarDireto(String xffFinal) throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "forjado-" + i + ", " + xffFinal, null)
                    .andExpect(status().isAccepted());
        }
    }

    @Test
    void o_filtro_de_cabecalhos_encaminhados_nao_esta_na_cadeia() {
        assertThat(ambiente.getProperty("server.forward-headers-strategy")).isEqualTo("none");
        assertThat(contexto.getBeansOfType(FilterRegistrationBean.class).values())
                .noneSatisfy(registro -> assertThat(registro.getFilter()).isInstanceOf(ForwardedHeaderFilter.class));
    }

    @Test
    void via_vercel_o_cliente_e_o_terceiro_da_direita_e_cada_um_tem_seu_balde() throws Exception {
        String xffA = IP_A + ", " + VERCEL + ", " + BORDA;
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", xffA, SEGREDO_TESTE).andExpect(status().isAccepted());
        }

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", xffA, SEGREDO_TESTE)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value("Muitos pedidos agora. Tente de novo mais tarde."));
        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", IP_B + ", " + VERCEL + ", " + BORDA, SEGREDO_TESTE)
                .andExpect(status().isAccepted());
    }

    @Test
    void via_vercel_um_forjado_a_esquerda_do_cliente_nao_muda_o_balde() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "forjado-" + i + ", " + IP_A + ", " + VERCEL + ", " + BORDA,
                    SEGREDO_TESTE).andExpect(status().isAccepted());
        }

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, " + IP_A + ", " + VERCEL + ", " + BORDA, SEGREDO_TESTE)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void direto_o_forjado_a_esquerda_nao_foge_do_limite() throws Exception {
        esgotarDireto(IP_A + ", " + BORDA);

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, " + IP_A + ", " + BORDA, null)
                .andExpect(status().isTooManyRequests());
        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, " + IP_B + ", " + BORDA, null)
                .andExpect(status().isAccepted());
    }

    @Test
    void direto_com_segredo_errado_e_tratado_como_direto() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "forjado-" + i + ", " + IP_A + ", " + BORDA, "errado")
                    .andExpect(status().isAccepted());
        }

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, " + IP_A + ", " + BORDA, "errado")
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void o_limite_vale_tambem_no_cadastro() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            cadastro("novo" + i + "@exemplo.com", "forjado-" + i + ", " + IP_A + ", " + BORDA)
                    .andExpect(status().isAccepted());
        }

        cadastro("novo" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, " + IP_A + ", " + BORDA)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void sem_xff_nao_da_erro_de_servidor() throws Exception {
        esqueci("pessoa@exemplo.com", null, null).andExpect(status().isAccepted());
    }

    @Test
    void xff_so_com_virgulas_nunca_da_5xx() throws Exception {
        esqueci("pessoa@exemplo.com", ",,  ,", null).andExpect(status().isAccepted());
    }

    @Test
    void xff_curto_demais_usa_o_endereco_da_conexao() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", IP_A, null).andExpect(status().isAccepted());
        }

        // Um token só: ninguém é "cliente", todos caem no endereço da conexão (127.0.0.1 no MockMvc).
        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", IP_B, null).andExpect(status().isTooManyRequests());
    }

    @Test
    void xff_em_duas_linhas_o_forjado_na_primeira_nao_troca_o_balde() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            mvc.perform(post("/api/auth/esqueci-senha")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Forwarded-For", "forjado-" + i)
                    .header("X-Forwarded-For", IP_A + ", " + BORDA)
                    .content("{\"email\":\"pessoa%d@exemplo.com\"}".formatted(i)))
                    .andExpect(status().isAccepted());
        }

        mvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "forjado-novo")
                .header("X-Forwarded-For", IP_A + ", " + BORDA)
                .content("{\"email\":\"extra@exemplo.com\"}"))
                .andExpect(status().isTooManyRequests());
        // Outro cliente na 2a linha tem balde proprio: prova que a linha 2 foi lida, nao so o remoteAddr.
        mvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "forjado-novo")
                .header("X-Forwarded-For", IP_B + ", " + BORDA)
                .content("{\"email\":\"extra@exemplo.com\"}"))
                .andExpect(status().isAccepted());
    }

    @Test
    void ipv6_do_mesmo_64_divide_o_balde() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "forjado, 2001:db8:1:2::" + (i + 1) + ", " + BORDA, null)
                    .andExpect(status().isAccepted());
        }

        esqueci("extra@exemplo.com", "forjado, 2001:db8:1:2:ffff::9, " + BORDA, null)
                .andExpect(status().isTooManyRequests());
        esqueci("extra@exemplo.com", "forjado, 2001:db8:1:3::1, " + BORDA, null).andExpect(status().isAccepted());
    }

    @Test
    void cliente_ipv6_vira_uma_chave_estavel() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "forjado-" + i + ", 2001:db8::1, " + BORDA, null)
                    .andExpect(status().isAccepted());
        }

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "forjado-novo, 2001:db8::1, " + BORDA, null)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void token_com_lixo_cai_no_endereco_da_conexao() throws Exception {
        for (int i = 0; i < LimiteEnvio.MAX_POR_IP_HORA; i++) {
            esqueci("pessoa" + i + "@exemplo.com", "<script>" + i + ", " + BORDA, null)
                    .andExpect(status().isAccepted());
        }

        esqueci("pessoa" + LimiteEnvio.MAX_POR_IP_HORA + "@exemplo.com", "<script>x, " + BORDA, null).andExpect(status().isTooManyRequests());
    }
}
