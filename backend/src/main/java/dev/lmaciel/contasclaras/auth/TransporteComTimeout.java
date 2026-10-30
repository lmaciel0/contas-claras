package dev.lmaciel.contasclaras.auth;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.LowLevelHttpRequest;
import com.google.api.client.http.LowLevelHttpResponse;

/**
 * Transporte HTTP (só GET) com teto de tempo de conexão e de leitura. Existe porque o
 * {@code GooglePublicKeysManager} busca as chaves públicas do Google sem aceitar um
 * {@code HttpRequestInitializer}, o {@code NetHttpTransport} é final e o {@code HttpRequest} pede 20 s
 * por padrão: sem este teto, um endpoint do Google fora do ar prende threads de uma rota pública.
 * O tempo de leitura vale por leitura no socket, não pelo total da resposta.
 */
final class TransporteComTimeout extends HttpTransport {

    private final int conexaoMaxMs;
    private final int leituraMaxMs;

    TransporteComTimeout(Duration conexaoMax, Duration leituraMax) {
        this.conexaoMaxMs = Math.toIntExact(conexaoMax.toMillis());
        this.leituraMaxMs = Math.toIntExact(leituraMax.toMillis());
    }

    @Override
    public boolean supportsMethod(String method) {
        return "GET".equals(method);
    }

    @Override
    protected Requisicao buildRequest(String method, String url) throws IOException {
        if (!supportsMethod(method)) {
            throw new IllegalArgumentException("Método HTTP não suportado: " + method);
        }
        HttpURLConnection conexao = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conexao.setRequestMethod(method);
        conexao.setInstanceFollowRedirects(false); // o HttpRequest da biblioteca segue os redirecionamentos
        conexao.setUseCaches(false);
        Requisicao requisicao = new Requisicao(conexao, conexaoMaxMs, leituraMaxMs);
        requisicao.setTimeout(conexaoMaxMs, leituraMaxMs);
        return requisicao;
    }

    static final class Requisicao extends LowLevelHttpRequest {

        private final HttpURLConnection conexao;
        private final int conexaoMaxMs;
        private final int leituraMaxMs;

        Requisicao(HttpURLConnection conexao, int conexaoMaxMs, int leituraMaxMs) {
            this.conexao = conexao;
            this.conexaoMaxMs = conexaoMaxMs;
            this.leituraMaxMs = leituraMaxMs;
        }

        HttpURLConnection conexao() {
            return conexao;
        }

        @Override
        public void addHeader(String nome, String valor) {
            conexao.addRequestProperty(nome, valor);
        }

        /** Chamado pelo HttpRequest com os valores dele (20 s): nunca passa do teto; 0 (sem limite) vira o teto. */
        @Override
        public void setTimeout(int conexaoMs, int leituraMs) {
            conexao.setConnectTimeout(limitar(conexaoMs, conexaoMaxMs));
            conexao.setReadTimeout(limitar(leituraMs, leituraMaxMs));
        }

        private static int limitar(int pedido, int maximo) {
            return pedido <= 0 ? maximo : Math.min(pedido, maximo);
        }

        @Override
        public LowLevelHttpResponse execute() throws IOException {
            conexao.connect();
            return new Resposta(conexao);
        }
    }

    private static final class Resposta extends LowLevelHttpResponse {

        private final HttpURLConnection conexao;
        private final int status;
        private final List<String> nomes = new ArrayList<>();
        private final List<String> valores = new ArrayList<>();

        Resposta(HttpURLConnection conexao) throws IOException {
            this.conexao = conexao;
            this.status = conexao.getResponseCode(); // aqui estoura o timeout de leitura
            for (int i = 0;; i++) {
                String nome = conexao.getHeaderFieldKey(i);
                String valor = conexao.getHeaderField(i);
                if (nome == null && valor == null) {
                    break;
                }
                if (nome != null && valor != null) {
                    nomes.add(nome);
                    valores.add(valor);
                }
            }
        }

        @Override
        public InputStream getContent() throws IOException {
            try {
                return conexao.getInputStream();
            } catch (IOException e) {
                return conexao.getErrorStream();
            }
        }

        @Override
        public String getContentEncoding() {
            return conexao.getContentEncoding();
        }

        @Override
        public long getContentLength() {
            return conexao.getContentLengthLong();
        }

        @Override
        public String getContentType() {
            return conexao.getContentType();
        }

        @Override
        public String getStatusLine() {
            return conexao.getHeaderField(0);
        }

        @Override
        public int getStatusCode() {
            return status;
        }

        @Override
        public String getReasonPhrase() throws IOException {
            return conexao.getResponseMessage();
        }

        @Override
        public int getHeaderCount() {
            return nomes.size();
        }

        @Override
        public String getHeaderName(int indice) {
            return nomes.get(indice);
        }

        @Override
        public String getHeaderValue(int indice) {
            return valores.get(indice);
        }

        @Override
        public void disconnect() {
            conexao.disconnect();
        }
    }
}
