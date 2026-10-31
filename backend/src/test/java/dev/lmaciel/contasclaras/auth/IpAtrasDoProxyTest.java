package dev.lmaciel.contasclaras.auth;

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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.filter.ForwardedHeaderFilter;

import dev.lmaciel.contasclaras.IntegracaoTest;

/**
 * O limite por IP usa {@code getRemoteAddr()}. Atrás do proxy da Vercel isso só é o cliente de verdade se o
 * {@code ForwardedHeaderFilter} (de {@code server.forward-headers-strategy: framework}) estiver na cadeia e
 * reescrever o endereço a partir de {@code X-Forwarded-For}. O teste passa pela cadeia de filtros do MockMvc.
 */
class IpAtrasDoProxyTest extends IntegracaoTest {

    private static final String IP_A = "198.51.100.10";
    private static final String IP_B = "198.51.100.20";

    @Autowired
    ApplicationContext contexto;

    @Autowired
    Environment ambiente;

    private ResultActions esqueci(String email, String xForwardedFor) throws Exception {
        return mvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", xForwardedFor)
                .content("{\"email\":\"%s\"}".formatted(email)));
    }

    @Test
    void o_filtro_de_cabecalhos_encaminhados_esta_ativo_na_cadeia_do_teste() {
        assertThat(ambiente.getProperty("server.forward-headers-strategy")).isEqualTo("framework");
        assertThat(contexto.getBeansOfType(FilterRegistrationBean.class).values())
                .anySatisfy(registro -> assertThat(registro.getFilter()).isInstanceOf(ForwardedHeaderFilter.class));
    }

    @Test
    void limite_por_ip_usa_o_x_forwarded_for_e_nao_o_endereco_do_proxy() throws Exception {
        for (int i = 0; i < 10; i++) {
            esqueci("pessoa" + i + "@exemplo.com", IP_A).andExpect(status().isAccepted());
        }

        esqueci("pessoa10@exemplo.com", IP_A)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value("Muitos pedidos agora. Tente de novo mais tarde."));
        // Outro cliente atrás do mesmo proxy não paga pelo IP A.
        esqueci("pessoa10@exemplo.com", IP_B).andExpect(status().isAccepted());
    }
}
