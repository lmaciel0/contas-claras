package dev.lmaciel.aprumo.diagnostico;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Corpo de no máximo 16 KB em {@code POST /api/diagnostico/erros}, só nessa rota. Com {@code Content-Length}
 * maior, responde 413 sem ler nada. Sem {@code Content-Length} (chunked), lê no máximo 16 KB + 1 byte: se
 * passar, responde 413; se não, entrega o corpo já lido ao resto da cadeia.
 */
@Component
class LimiteCorpoRelato extends OncePerRequestFilter {

    static final String CAMINHO = "/api/diagnostico/erros";
    static final int MAX_BYTES = 16 * 1024;

    private static final String CORPO_413 = "{\"erro\":\"Relato grande demais.\"}";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !CAMINHO.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long tamanho = request.getContentLengthLong();
        if (tamanho > MAX_BYTES) {
            grande(response);
            return;
        }
        if (tamanho >= 0) {
            chain.doFilter(request, response);
            return;
        }
        byte[] lido = request.getInputStream().readNBytes(MAX_BYTES + 1);
        if (lido.length > MAX_BYTES) {
            grande(response);
            return;
        }
        chain.doFilter(new ComCorpoLido(request, lido), response);
    }

    private static void grande(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(CORPO_413);
    }

    private static final class ComCorpoLido extends HttpServletRequestWrapper {

        private final byte[] corpo;

        ComCorpoLido(HttpServletRequest request, byte[] corpo) {
            super(request);
            this.corpo = corpo;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream origem = new ByteArrayInputStream(corpo);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return origem.read();
                }

                @Override
                public int read(byte[] b, int off, int len) {
                    return origem.read(b, off, len);
                }

                @Override
                public boolean isFinished() {
                    return origem.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    throw new UnsupportedOperationException("leitura assíncrona não suportada");
                }
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            String encoding = getCharacterEncoding();
            java.nio.charset.Charset charset = encoding == null
                    ? StandardCharsets.UTF_8 : java.nio.charset.Charset.forName(encoding);
            return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(), charset));
        }

        @Override
        public int getContentLength() {
            return corpo.length;
        }

        @Override
        public long getContentLengthLong() {
            return corpo.length;
        }
    }
}
