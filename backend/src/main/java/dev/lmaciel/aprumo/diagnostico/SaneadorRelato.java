package dev.lmaciel.aprumo.diagnostico;

import java.util.regex.Pattern;

/**
 * Limpa no servidor o texto de um relato de erro, porque o cliente não é confiável: o front já tenta limpar,
 * mas quem chama a rota pode mandar qualquer coisa. Tira o que pode ser dado pessoal (e-mail, token, query
 * string, fragmento, id numérico na rota) e o que pode forjar linha de log (caracteres de controle).
 */
final class SaneadorRelato {

    private static final Pattern QUERY = Pattern.compile("\\?[^\\s)'\"]*");
    private static final Pattern FRAGMENTO = Pattern.compile("#[^\\s)'\"]*");
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+");
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9_-]{24,}");
    private static final Pattern CONTROLE = Pattern.compile("[\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}]");
    private static final Pattern SEGMENTO_NUMERICO = Pattern.compile("/\\d+(?=/|$)");

    private SaneadorRelato() {
    }

    /**
     * Para mensagem e pilha. A query e o fragmento saem primeiro, porque a troca de controle por {@code ?}
     * produziria um {@code ?} que a limpeza de query comeria junto com o texto seguinte.
     */
    static String texto(String valor) {
        if (valor == null) {
            return "";
        }
        String limpo = QUERY.matcher(valor).replaceAll("");
        limpo = FRAGMENTO.matcher(limpo).replaceAll("");
        limpo = EMAIL.matcher(limpo).replaceAll("[email]");
        limpo = TOKEN.matcher(limpo).replaceAll("[token]");
        return CONTROLE.matcher(limpo).replaceAll("?");
    }

    /** Para a rota: a mesma limpeza, mais segmentos só de dígitos virando {@code /:id}. */
    static String rota(String valor) {
        return SEGMENTO_NUMERICO.matcher(texto(valor)).replaceAll("/:id");
    }

    /** Barra e aspas escapadas, para o valor caber entre aspas no log sem fechá-las nem forjar outro campo. */
    static String escapar(String valor) {
        return valor.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
