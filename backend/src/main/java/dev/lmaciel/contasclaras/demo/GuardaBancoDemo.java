package dev.lmaciel.contasclaras.demo;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Trava do seed de demonstração: a conta demo tem senha pública, então ela só pode nascer em banco local
 * ({@code localhost}, {@code 127.0.0.1} ou {@code ::1}), ou com a autorização explícita
 * {@code app.demo.permitir=true}.
 *
 * <p>Na dúvida, recusa: URL fora do formato {@code jdbc:<banco>://host...}, sem host ou com qualquer host
 * remoto na lista não é local.
 */
final class GuardaBancoDemo {

    static final String PROPRIEDADE_PERMITIR = "app.demo.permitir";

    /** Prefixo {@code jdbc:<banco>://} e, em seguida, a autoridade (usuário@host:porta,host:porta) até {@code /} ou {@code ?}. */
    private static final Pattern URL_JDBC = Pattern.compile("^jdbc:[A-Za-z0-9]+://([^/?#]*)");

    private GuardaBancoDemo() {
    }

    /** Falha com mensagem clara se o banco não é local e não há autorização explícita. Não cria nada. */
    static void exigir(String urlJdbc, boolean permitir) {
        if (permitir || local(urlJdbc)) {
            return;
        }
        List<String> hosts = hosts(urlJdbc);
        String onde = hosts.isEmpty() || hosts.contains("")
                ? "não foi possível identificar o host do banco"
                : "o host do banco é " + String.join(", ", hosts);
        throw new IllegalStateException("Seed de demonstração recusado: " + onde + ", e não é local. "
                + "A conta demo tem senha pública e não pode existir em um banco real. "
                + "Para rodar mesmo assim, defina " + PROPRIEDADE_PERMITIR + "=true.");
    }

    /** {@code true} só se a URL tem pelo menos um host e todos são locais. */
    static boolean local(String urlJdbc) {
        List<String> hosts = hosts(urlJdbc);
        return !hosts.isEmpty() && hosts.stream().allMatch(GuardaBancoDemo::hostLocal);
    }

    private static boolean hostLocal(String host) {
        return host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1") || host.equals("::1");
    }

    /** Hosts da URL, sem usuário, senha nem porta. Entrada ilegível vira {@code ""}; URL sem host, lista vazia. */
    private static List<String> hosts(String urlJdbc) {
        if (urlJdbc == null) {
            return List.of();
        }
        Matcher url = URL_JDBC.matcher(urlJdbc.trim());
        if (!url.find()) {
            return List.of();
        }
        String autoridade = url.group(1);
        // O usuário e a senha ficam antes do último @: o host de verdade vem depois.
        autoridade = autoridade.substring(autoridade.lastIndexOf('@') + 1);
        if (autoridade.isBlank()) {
            return List.of();
        }
        List<String> hosts = new ArrayList<>();
        for (String entrada : autoridade.split(",", -1)) {
            hosts.add(host(entrada.trim()));
        }
        return hosts;
    }

    /** Host de uma entrada {@code host}, {@code host:porta} ou {@code [ipv6]:porta}; {@code ""} se malformada. */
    private static String host(String entrada) {
        if (entrada.startsWith("[")) {
            int fim = entrada.indexOf(']');
            boolean sufixoValido = fim > 0 && (fim == entrada.length() - 1 || entrada.charAt(fim + 1) == ':');
            return sufixoValido ? entrada.substring(1, fim) : "";
        }
        int doisPontos = entrada.indexOf(':');
        return doisPontos < 0 ? entrada : entrada.substring(0, doisPontos);
    }
}
