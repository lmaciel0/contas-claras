package dev.lmaciel.contasclaras.importacao;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.CategoriaLida;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.ItemLido;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.ValorLido;
import dev.lmaciel.contasclaras.lancamento.dto.MesAno;

/**
 * Lê a planilha anual do dono (uma aba por ano) sem tocar em banco nem em Spring. A entrada não é confiável:
 * arquivo que não for um .xlsx legível vira {@link IllegalArgumentException} com mensagem clara.
 *
 * <p>Estrutura das abas de ano: coluna B = nome, colunas C..N = JAN..DEZ (coluna O, total do ano, é ignorada).
 * Um bloco começa numa linha com JAN na coluna C (a coluna B dela é a categoria) e termina na linha TOTAL.
 * O bloco TOTAIS encerra a leitura da aba. O "pago" é a cor da fonte da célula: verde do tema (accent6).
 */
public final class PlanilhaParser {

    static final String MENSAGEM_ARQUIVO_INVALIDO = "Arquivo não é uma planilha .xlsx válida.";

    private static final Pattern ABA_DE_ANO = Pattern.compile("^\\d{4}$");
    private static final int COLUNA_NOME = 1;
    private static final int COLUNA_JANEIRO = 2;
    private static final int MESES = 12;
    private static final int TEMA_VERDE_PAGO = 9; // accent6, #70AD47
    private static final byte[] RGB_VERDE_PAGO = {(byte) 0x70, (byte) 0xAD, (byte) 0x47};
    private static final String PREFIXO_CARTOES = "CARTOES DE CREDITO";

    private PlanilhaParser() {
    }

    public static PlanilhaLida ler(InputStream xlsx) {
        try (XSSFWorkbook pasta = abrir(xlsx)) {
            return lerPasta(pasta);
        } catch (IOException e) { // só o close() da pasta chega aqui; falha ao abrir já virou IllegalArgumentException
            throw new UncheckedIOException(e);
        }
    }

    /** Só a abertura vira "arquivo inválido"; erros na leitura da estrutura são bugs e não são mascarados. */
    private static XSSFWorkbook abrir(InputStream xlsx) {
        Objects.requireNonNull(xlsx, "xlsx");
        try {
            return new XSSFWorkbook(xlsx);
        } catch (IOException | RuntimeException e) {
            throw new IllegalArgumentException(MENSAGEM_ARQUIVO_INVALIDO, e);
        }
    }

    private static PlanilhaLida lerPasta(XSSFWorkbook pasta) {
        SortedMap<Integer, XSSFSheet> abasPorAno = new TreeMap<>();
        for (int i = 0; i < pasta.getNumberOfSheets(); i++) {
            XSSFSheet aba = pasta.getSheetAt(i);
            if (ABA_DE_ANO.matcher(aba.getSheetName()).matches()) {
                abasPorAno.put(Integer.parseInt(aba.getSheetName()), aba);
            }
        }

        Map<String, CategoriaAcumulada> categorias = new LinkedHashMap<>();
        // do ano mais antigo para o mais recente: o nome e o vencimento do ano mais recente prevalecem
        abasPorAno.forEach((ano, aba) -> lerAba(ano, aba, categorias));

        List<CategoriaLida> lidas = new ArrayList<>();
        for (CategoriaAcumulada c : categorias.values()) {
            List<ItemLido> itens = new ArrayList<>();
            for (ItemAcumulado i : c.itens.values()) {
                itens.add(new ItemLido(i.nome, i.diaVencimento, i.cartao, Collections.unmodifiableSortedMap(i.valores)));
            }
            lidas.add(new CategoriaLida(c.nome, c.tipo, List.copyOf(itens)));
        }
        return new PlanilhaLida(List.copyOf(lidas));
    }

    private static void lerAba(int ano, XSSFSheet aba, Map<String, CategoriaAcumulada> categorias) {
        // chaves de item já usadas, por categoria, só neste ano: é aqui que "ALUGUEL" repetido vira "ALUGUEL 2"
        Map<String, Set<String>> chavesUsadas = new HashMap<>();
        CategoriaAcumulada atual = null;

        for (int r = Math.max(0, aba.getFirstRowNum()); r <= aba.getLastRowNum(); r++) {
            Row linha = aba.getRow(r);
            if (linha == null) {
                continue;
            }
            String nome = texto(linha.getCell(COLUNA_NOME));
            String chaveNome = NomeNormalizado.chave(nome);

            if (chaveNome.equals("TOTAIS")) {
                return; // tudo daqui para baixo (inclusive anotações soltas) é ignorado
            }
            if (ehCabecalhoDeBloco(linha)) {
                atual = chaveNome.isEmpty() ? null : categoria(categorias, nome, chaveNome);
                continue;
            }
            if (atual == null) {
                continue;
            }
            if (chaveNome.equals("TOTAL")) {
                atual = null;
                continue;
            }
            if (chaveNome.isEmpty()) {
                continue;
            }
            lerItem(ano, linha, nome, atual, chavesUsadas.computeIfAbsent(atual.chave, k -> new HashSet<>()));
        }
    }

    private static boolean ehCabecalhoDeBloco(Row linha) {
        return NomeNormalizado.chave(texto(linha.getCell(COLUNA_JANEIRO))).equals("JAN");
    }

    private static CategoriaAcumulada categoria(Map<String, CategoriaAcumulada> categorias, String nome, String chave) {
        CategoriaAcumulada c = categorias.computeIfAbsent(chave, k -> new CategoriaAcumulada(k));
        c.nome = nome.strip();
        c.tipo = chave.equals("RECEITAS") ? TipoCategoria.RECEITA : TipoCategoria.DESPESA;
        return c;
    }

    private static void lerItem(int ano, Row linha, String nomeBruto, CategoriaAcumulada categoria,
            Set<String> chavesUsadas) {
        NomeNormalizado.NomeSeparado separado = NomeNormalizado.separarVencimento(nomeBruto);
        String nome = separado.nome();
        String chave = NomeNormalizado.chave(nome);
        for (int n = 2; !chavesUsadas.add(chave); n++) {
            nome = separado.nome() + " " + n;
            chave = NomeNormalizado.chave(nome);
        }

        ItemAcumulado item = categoria.itens.computeIfAbsent(chave, k -> new ItemAcumulado());
        item.nome = nome;
        if (separado.dia() != null) {
            item.diaVencimento = separado.dia(); // anos em ordem crescente: vale o último ano com sufixo numérico
        }
        item.cartao = categoria.chave.startsWith(PREFIXO_CARTOES);

        for (int mes = 1; mes <= MESES; mes++) {
            Cell celula = linha.getCell(COLUNA_JANEIRO + mes - 1);
            BigDecimal valor = valor(celula);
            if (valor != null) {
                item.valores.put(new MesAno(ano, mes), new ValorLido(valor, pago(celula)));
            }
        }
    }

    /** Número da célula (ou valor em cache da fórmula) com 2 casas; null para vazio, texto, erro ou zero. */
    private static BigDecimal valor(Cell celula) {
        if (celula == null) {
            return null;
        }
        CellType tipo = celula.getCellType() == CellType.FORMULA
                ? celula.getCachedFormulaResultType()
                : celula.getCellType();
        if (tipo != CellType.NUMERIC) {
            return null;
        }
        double numero = celula.getNumericCellValue();
        if (Double.isNaN(numero) || Double.isInfinite(numero)) {
            return null;
        }
        BigDecimal valor = BigDecimal.valueOf(numero).setScale(2, RoundingMode.HALF_UP);
        return valor.signum() == 0 ? null : valor;
    }

    /** Pago = fonte verde: tema 9 (accent6) ou RGB 70AD47. As outras cores (preto, vermelho...) são previstas. */
    private static boolean pago(Cell celula) {
        CellStyle estilo = celula.getCellStyle();
        if (!(estilo instanceof XSSFCellStyle xssf) || xssf.getFont() == null) {
            return false;
        }
        XSSFColor cor = xssf.getFont().getXSSFColor();
        if (cor == null) {
            return false;
        }
        if (cor.isThemed()) {
            return cor.getTheme() == TEMA_VERDE_PAGO;
        }
        return cor.isRGB() && Arrays.equals(cor.getRGB(), RGB_VERDE_PAGO);
    }

    /** Texto da célula (também o resultado em cache de fórmula); vazio quando não for texto. */
    private static String texto(Cell celula) {
        if (celula == null) {
            return "";
        }
        CellType tipo = celula.getCellType() == CellType.FORMULA
                ? celula.getCachedFormulaResultType()
                : celula.getCellType();
        return tipo == CellType.STRING ? celula.getStringCellValue() : "";
    }

    private static final class CategoriaAcumulada {
        final String chave;
        String nome;
        TipoCategoria tipo;
        final Map<String, ItemAcumulado> itens = new LinkedHashMap<>();

        CategoriaAcumulada(String chave) {
            this.chave = chave;
        }
    }

    private static final class ItemAcumulado {
        String nome;
        Integer diaVencimento;
        boolean cartao;
        final SortedMap<MesAno, ValorLido> valores = new TreeMap<>();
    }
}
