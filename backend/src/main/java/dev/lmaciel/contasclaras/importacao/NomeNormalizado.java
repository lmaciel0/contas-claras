package dev.lmaciel.contasclaras.importacao;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Regras de nome da planilha: chave de comparação entre anos e sufixo de vencimento {@code (NN)}. */
public final class NomeNormalizado {

    private static final Pattern MARCAS = Pattern.compile("\\p{M}+");
    private static final Pattern ESPACOS = Pattern.compile("[\\s\\p{Z}]+");
    private static final Pattern SUFIXO_VENCIMENTO = Pattern.compile("^(.*?)\\s*\\((\\d{1,2})\\)\\s*$");

    /** A categoria se chamava DIVIDAS num ano e DIVIDAS/EMPRESTIMOS em outro. */
    private static final String ALIAS_ORIGEM = "DIVIDAS";
    private static final String ALIAS_DESTINO = "DIVIDAS/EMPRESTIMOS";

    /** Nome sem o sufixo {@code (NN)} e o dia lido dele; {@code dia} é null quando não há sufixo válido. */
    public record NomeSeparado(String nome, Integer dia) {
    }

    private NomeNormalizado() {
    }

    /** Maiúsculas, sem acento, espaços colapsados e aparados; vazio para null. Aplica o alias de DIVIDAS. */
    public static String chave(String nome) {
        if (nome == null) {
            return "";
        }
        String semAcento = MARCAS.matcher(Normalizer.normalize(nome, Normalizer.Form.NFD)).replaceAll("");
        String chave = ESPACOS.matcher(semAcento).replaceAll(" ").strip().toUpperCase(Locale.ROOT);
        return ALIAS_ORIGEM.equals(chave) ? ALIAS_DESTINO : chave;
    }

    /** Tira o sufixo {@code (NN)} quando NN é um dia de 1 a 31; qualquer outro nome fica como está (aparado). */
    public static NomeSeparado separarVencimento(String nome) {
        String aparado = nome == null ? "" : nome.strip();
        Matcher m = SUFIXO_VENCIMENTO.matcher(aparado);
        if (m.matches()) {
            int dia = Integer.parseInt(m.group(2));
            String semSufixo = m.group(1);
            if (dia >= 1 && dia <= 31 && !semSufixo.isBlank()) {
                return new NomeSeparado(semSufixo, dia);
            }
        }
        return new NomeSeparado(aparado, null);
    }
}
