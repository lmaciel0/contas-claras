package dev.lmaciel.aprumo.diagnostico;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Sem Content-Length (chunked) o MockMvc não consegue simular, então o filtro é testado direto. */
class LimiteCorpoRelatoTest {

    private final LimiteCorpoRelato filtro = new LimiteCorpoRelato();

    /** Pedido sem Content-Length, como no Transfer-Encoding: chunked. */
    private static MockHttpServletRequest chunked(byte[] corpo) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/diagnostico/erros") {
            @Override
            public long getContentLengthLong() {
                return -1;
            }

            @Override
            public int getContentLength() {
                return -1;
            }
        };
        req.setContent(corpo);
        return req;
    }

    @Test
    void chunked_acima_de_16_kb_responde_413_e_nao_chama_o_resto_da_cadeia() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain cadeia = new MockFilterChain();

        filtro.doFilter(chunked(new byte[16 * 1024 + 1]), res, cadeia);

        assertThat(res.getStatus()).isEqualTo(413);
        assertThat(cadeia.getRequest()).isNull();
    }

    @Test
    void chunked_ate_16_kb_passa_e_o_corpo_continua_legivel() throws Exception {
        byte[] corpo = "{\"a\":1}".getBytes(StandardCharsets.UTF_8);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain cadeia = new MockFilterChain();

        filtro.doFilter(chunked(corpo), res, cadeia);

        assertThat(res.getStatus()).isEqualTo(200);
        assertThat(cadeia.getRequest()).isNotNull();
        assertThat(new String(cadeia.getRequest().getInputStream().readAllBytes(), StandardCharsets.UTF_8))
                .isEqualTo("{\"a\":1}");
    }

    @Test
    void content_length_acima_de_16_kb_responde_413_sem_ler_o_corpo() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/diagnostico/erros");
        req.setContent(new byte[16 * 1024 + 1]);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain cadeia = new MockFilterChain();

        filtro.doFilter(req, res, cadeia);

        assertThat(res.getStatus()).isEqualTo(413);
        assertThat(cadeia.getRequest()).isNull();
    }

    @Test
    void outras_rotas_nao_sao_filtradas() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setContent(new byte[16 * 1024 + 1]);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain cadeia = new MockFilterChain();

        filtro.doFilter(req, res, cadeia);

        assertThat(res.getStatus()).isEqualTo(200);
        assertThat(cadeia.getRequest()).isNotNull();
    }
}
