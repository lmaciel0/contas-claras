package dev.lmaciel.contasclaras.nota;

/** Regras de texto digitado compartilhadas por títulos e nomes: pontas limpas, sem controle nem direção. */
public final class TextoSeguro {

    /**
     * Regex para {@code @Pattern}: vale só se NÃO houver caractere de controle (Cc, incluindo nulo, tab e
     * quebras de linha) nem de direção de texto (marcas LRM/RLM/ALM, embeddings e overrides LRE a RLO,
     * isolates LRI a PDI).
     */
    public static final String TEM_CARACTERE_PROIBIDO =
            "[^\\p{Cc}\\u061C\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF]*";

    private TextoSeguro() {
    }

    /** Remove das pontas todo espaço, inclusive os não separáveis (U+00A0, U+2007, U+202F e demais Zs). */
    public static String limpar(String texto) {
        if (texto == null) {
            return null;
        }
        int inicio = 0;
        int fim = texto.length();
        while (inicio < fim && espaco(texto.charAt(inicio))) {
            inicio++;
        }
        while (fim > inicio && espaco(texto.charAt(fim - 1))) {
            fim--;
        }
        return texto.substring(inicio, fim);
    }

    private static boolean espaco(char c) {
        return Character.isWhitespace(c) || Character.isSpaceChar(c);
    }
}
