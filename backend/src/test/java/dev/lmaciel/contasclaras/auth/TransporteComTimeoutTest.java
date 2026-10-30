package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.SocketTimeoutException;
import java.time.Duration;

import org.junit.jupiter.api.Test;

import com.google.api.client.http.GenericUrl;

/**
 * A biblioteca do Google busca as chaves públicas sem aceitar um HttpRequestInitializer, e o
 * HttpRequest pede 20 s por padrão; o transporte é quem precisa impor o teto. Sem rede externa.
 */
class TransporteComTimeoutTest {

    @Test
    void transporte_do_adapter_limita_conexao_e_leitura_a_3_segundos() throws Exception {
        var requisicao = GoogleIdTokenVerifierAdapter.novoTransporte().buildRequest("GET", "https://exemplo.com/certs");

        requisicao.setTimeout(20_000, 20_000); // o que o HttpRequest pede por padrão

        assertThat(requisicao.conexao().getConnectTimeout()).isEqualTo(3_000);
        assertThat(requisicao.conexao().getReadTimeout()).isEqualTo(3_000);
    }

    @Test
    void timeout_maior_que_o_teto_e_reduzido_menor_e_respeitado_e_zero_vira_o_teto() throws Exception {
        var transporte = new TransporteComTimeout(Duration.ofSeconds(3), Duration.ofSeconds(3));

        var requisicao = transporte.buildRequest("GET", "https://exemplo.com/certs");
        requisicao.setTimeout(1_000, 2_000);
        assertThat(requisicao.conexao().getConnectTimeout()).isEqualTo(1_000);
        assertThat(requisicao.conexao().getReadTimeout()).isEqualTo(2_000);

        requisicao.setTimeout(0, 0); // 0 significa "sem limite" no HttpURLConnection
        assertThat(requisicao.conexao().getConnectTimeout()).isEqualTo(3_000);
        assertThat(requisicao.conexao().getReadTimeout()).isEqualTo(3_000);
    }

    @Test
    void sem_pedir_timeout_a_conexao_ja_nasce_limitada() throws Exception {
        var requisicao = new TransporteComTimeout(Duration.ofSeconds(3), Duration.ofSeconds(3))
                .buildRequest("GET", "https://exemplo.com/certs");

        assertThat(requisicao.conexao().getConnectTimeout()).isEqualTo(3_000);
        assertThat(requisicao.conexao().getReadTimeout()).isEqualTo(3_000);
    }

    @Test
    void servidor_que_aceita_e_nao_responde_estoura_o_timeout_de_leitura() throws Exception {
        try (ServerSocket mudo = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            var transporte = new TransporteComTimeout(Duration.ofMillis(500), Duration.ofMillis(300));
            var requisicao = transporte.createRequestFactory()
                    .buildGetRequest(new GenericUrl("http://127.0.0.1:" + mudo.getLocalPort() + "/"));

            assertTimeoutPreemptively(Duration.ofSeconds(10),
                    () -> assertThatThrownBy(requisicao::execute).isInstanceOf(SocketTimeoutException.class));
        }
    }

    @Test
    void so_aceita_get() {
        var transporte = new TransporteComTimeout(Duration.ofSeconds(3), Duration.ofSeconds(3));

        assertThat(transporte.supportsMethod("GET")).isTrue();
        assertThat(transporte.supportsMethod("POST")).isFalse();
        assertThatThrownBy(() -> transporte.buildRequest("POST", "https://exemplo.com/certs"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
