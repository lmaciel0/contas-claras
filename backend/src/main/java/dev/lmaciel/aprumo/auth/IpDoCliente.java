package dev.lmaciel.aprumo.auth;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Descobre o IP do cliente para o limite por IP, lendo o {@code X-Forwarded-For} cru e contando da direita.
 * Cada proxy acrescenta ao fim o endereço de quem falou com ele, então só os últimos itens são confiáveis; o
 * que vem à esquerda o cliente pode forjar. A cadeia real é {@code cliente, Vercel, borda do Render} (pedido
 * via rewrite da Vercel) ou {@code [forjado,] cliente, borda do Render} (direto na API). Se o cabeçalho vier em
 * várias linhas, elas são juntas na ordem, como um único valor separado por vírgulas.
 * <p>
 * O rewrite da Vercel envia o segredo em {@code X-Aprumo-Origem}: com ele correto há um salto a mais e o
 * cliente é o 3º da direita; sem ele (ausente, errado ou segredo não configurado), é o 2º. Cadeia curta demais
 * ou item que não seja um IP válido cai em {@code getRemoteAddr()}.
 * <p>
 * IPv4 vale como está. IPv6 vira a chave do prefixo /64 (um cliente controla o /64 inteiro e giraria de
 * endereço para fugir do limite); IPv6 mapeado de IPv4 vira o IPv4.
 */
@Component
public class IpDoCliente {

    private static final Logger log = LoggerFactory.getLogger(IpDoCliente.class);

    static final String CABECALHO_ORIGEM = "X-Aprumo-Origem";
    private static final String CABECALHO_XFF = "X-Forwarded-For";
    private static final int TAMANHO_MAXIMO_IP = 45;
    private static final String OCTETO = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";
    private static final Pattern IPV4 = Pattern.compile(OCTETO + "(?:\\." + OCTETO + "){3}");
    private static final Pattern CHARS_IPV6 = Pattern.compile("[0-9a-fA-F:.]+");

    private final byte[] segredoOrigem;

    public IpDoCliente(@Value("${aprumo.proxy.segredo-origem:}") String segredoOrigem) {
        String aparado = segredoOrigem == null ? "" : segredoOrigem.trim();
        this.segredoOrigem = aparado.getBytes(StandardCharsets.UTF_8);
        if (aparado.isEmpty()) {
            log.warn("segredo de origem não configurado: todo pedido é tratado como direto na API");
        }
    }

    /** Nunca devolve nulo nem vazio. */
    public String de(HttpServletRequest request) {
        int saltos = vemDaVercel(request) ? 2 : 1;
        String xff = xffCompleto(request);
        if (xff != null) {
            List<String> itens = Arrays.stream(xff.split(","))
                    .map(String::trim)
                    .filter(item -> !item.isEmpty())
                    .toList();
            int indice = itens.size() - 1 - saltos;
            if (indice >= 0) {
                String chave = chaveDoIp(itens.get(indice));
                if (chave != null) {
                    return chave;
                }
            }
        }
        String remoto = request.getRemoteAddr();
        return remoto == null || remoto.isBlank() ? "desconhecido" : remoto;
    }

    private static String xffCompleto(HttpServletRequest request) {
        Enumeration<String> linhas = request.getHeaders(CABECALHO_XFF);
        if (linhas == null) {
            return null;
        }
        List<String> todas = Collections.list(linhas);
        return todas.isEmpty() ? null : String.join(",", todas);
    }

    private boolean vemDaVercel(HttpServletRequest request) {
        String enviado = request.getHeader(CABECALHO_ORIGEM);
        if (segredoOrigem.length == 0 || enviado == null) {
            return false;
        }
        return MessageDigest.isEqual(segredoOrigem, enviado.getBytes(StandardCharsets.UTF_8));
    }

    /** Chave do balde para um item do XFF, ou nulo se não for um IP válido. Nunca consulta DNS. */
    private static String chaveDoIp(String item) {
        if (item.length() > TAMANHO_MAXIMO_IP) {
            return null;
        }
        if (IPV4.matcher(item).matches()) {
            return item;
        }
        // Só literais com ':' chegam ao getByName, que então não faz DNS.
        if (item.indexOf(':') < 0 || !CHARS_IPV6.matcher(item).matches()) {
            return null;
        }
        InetAddress endereco;
        try {
            endereco = InetAddress.getByName(item);
        } catch (UnknownHostException e) {
            return null;
        }
        if (endereco instanceof Inet4Address) {
            return endereco.getHostAddress();
        }
        byte[] b = endereco.getAddress();
        return "%x:%x:%x:%x::/64".formatted(
                ((b[0] & 0xff) << 8) | (b[1] & 0xff),
                ((b[2] & 0xff) << 8) | (b[3] & 0xff),
                ((b[4] & 0xff) << 8) | (b[5] & 0xff),
                ((b[6] & 0xff) << 8) | (b[7] & 0xff));
    }
}
