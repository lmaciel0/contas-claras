package dev.lmaciel.contasclaras.importacao;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.function.Consumer;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Planilha anual inventada, no formato da real: uma aba por ano, blocos de categoria que começam numa linha com
 * JAN na coluna C e terminam em TOTAL, bloco TOTAIS no fim. Só nomes e valores fictícios. Gerada em memória.
 *
 * <p>O "pago" é a cor da fonte: tema 9 (accent6), com uma célula em ARGB FF70AD47 para cobrir o outro caminho.
 */
public final class PlanilhaFicticia {

    private static final String[] MESES =
            {"JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"};
    private static final int COLUNA_NOME = 1;
    private static final int COLUNA_PRIMEIRO_MES = 2;
    private static final int COLUNA_TOTAL_ANO = 14;

    private PlanilhaFicticia() {
    }

    public static byte[] gerar() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream saida = new ByteArrayOutputStream()) {
            Estilos e = new Estilos(wb);

            wb.createSheet("2024"); // aba de ano vazia: não gera nada

            aba2025(new Aba(wb.createSheet("2025")), e);
            aba2026(new Aba(wb.createSheet("2026")), e);
            abaAnotacoes(new Aba(wb.createSheet("ANOTACOES")), e);

            wb.getCreationHelper().createFormulaEvaluator().evaluateAll(); // grava o valor em cache das fórmulas
            wb.write(saida);
            return saida.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static void aba2025(Aba aba, Estilos e) {
        aba.titulo("ORCAMENTO 2025");

        aba.cabecalho("RECEITAS");
        aba.item("SALARIO", num(1, 3000.00, e.verdeTema), num(2, 3000.00, e.pretoComFundoVerde));
        aba.item("FREELA", num(1, 500.555, e.preto));
        aba.total();

        aba.cabecalho("DIVIDAS");
        aba.item("EMPRESTIMO A", num(1, 100.00, e.verdeRgb));
        aba.total();

        aba.cabecalho("DOMESTICA");
        aba.item("LUZ (10)", num(1, 150.00, e.verdeTema));
        aba.item("AGUA", num(1, 0, e.preto), vazia(2, e.preto), texto(3, "-", e.preto));
        aba.total();

        aba.cabecalho("TOTAIS");
        aba.item("RECEITAS", num(1, 3500.555, e.preto));
        aba.item("DESPESAS", num(1, 250.00, e.preto));
        aba.pular(2);

        // tudo abaixo de TOTAIS é ignorado, inclusive um bloco inteiro
        aba.cabecalho("FANTASMA");
        aba.item("ITEM FANTASMA", num(1, 999.00, e.verdeTema));
        aba.total();
    }

    private static void aba2026(Aba aba, Estilos e) {
        aba.titulo("ORCAMENTO 2026");

        aba.cabecalho("RECEITAS");
        aba.item("SALARIO", num(1, 3200.00, e.verdeTema));
        aba.total();

        aba.cabecalho("DIVIDAS/EMPRESTIMOS");
        aba.item("EMPRESTIMO A", num(2, 100.00, e.vermelho));
        aba.total();

        aba.cabecalho("DOMÉSTICA");
        aba.item("LUZ (12)", formula(1, "150+10", e.verdeTema));
        aba.item("ALUGUEL", num(1, 900.00, e.preto));
        aba.item("ALUGUEL", num(1, 50.00, e.preto));
        aba.total();

        aba.cabecalho("CARTÕES DE CREDITO - TESTE");
        aba.item("CARTAO X (05)", num(1, 700.00, e.verdeTema));
        aba.total();

        aba.cabecalho("TOTAIS");
        aba.item("RECEITAS", num(1, 3200.00, e.preto));
        aba.item("DESPESAS", num(1, 1910.00, e.preto));

        aba.celulaSolta(115, 9, 20000); // anotação solta: J116
    }

    private static void abaAnotacoes(Aba aba, Estilos e) {
        aba.cabecalho("NOTAS");
        aba.item("ITEM NOTA", num(1, 123.00, e.verdeTema));
        aba.total();
    }

    // ---- células

    private record Celula(int mes, XSSFCellStyle estilo, Consumer<Cell> valor) {
    }

    private static Celula num(int mes, double valor, XSSFCellStyle estilo) {
        return new Celula(mes, estilo, c -> c.setCellValue(valor));
    }

    private static Celula texto(int mes, String valor, XSSFCellStyle estilo) {
        return new Celula(mes, estilo, c -> c.setCellValue(valor));
    }

    private static Celula vazia(int mes, XSSFCellStyle estilo) {
        return new Celula(mes, estilo, Cell::setBlank);
    }

    private static Celula formula(int mes, String formula, XSSFCellStyle estilo) {
        return new Celula(mes, estilo, c -> c.setCellFormula(formula));
    }

    // ---- aba

    private static final class Aba {
        private final XSSFSheet folha;
        private int linha = 0;

        Aba(XSSFSheet folha) {
            this.folha = folha;
        }

        void titulo(String texto) {
            folha.createRow(linha++).createCell(COLUNA_NOME).setCellValue(texto);
            linha++;
        }

        void pular(int linhas) {
            linha += linhas;
        }

        void cabecalho(String categoria) {
            Row row = folha.createRow(linha++);
            row.createCell(COLUNA_NOME).setCellValue(categoria);
            for (int i = 0; i < MESES.length; i++) {
                row.createCell(COLUNA_PRIMEIRO_MES + i).setCellValue(MESES[i]);
            }
            row.createCell(COLUNA_TOTAL_ANO).setCellValue("TOTAL ANO");
        }

        void item(String nome, Celula... celulas) {
            Row row = folha.createRow(linha++);
            row.createCell(COLUNA_NOME).setCellValue(nome);
            for (Celula c : celulas) {
                Cell cell = row.createCell(COLUNA_PRIMEIRO_MES + c.mes() - 1);
                c.valor().accept(cell);
                cell.setCellStyle(c.estilo());
            }
            row.createCell(COLUNA_TOTAL_ANO).setCellValue(1234.50); // coluna O: total do ano, ignorada
        }

        void total() {
            Row row = folha.createRow(linha++);
            row.createCell(COLUNA_NOME).setCellValue("TOTAL");
            for (int i = 0; i < MESES.length; i++) {
                row.createCell(COLUNA_PRIMEIRO_MES + i).setCellValue(111.11);
            }
            row.createCell(COLUNA_TOTAL_ANO).setCellValue(1333.32);
            linha++;
        }

        void celulaSolta(int linhaIndice, int coluna, double valor) {
            folha.createRow(linhaIndice).createCell(coluna).setCellValue(valor);
        }
    }

    // ---- estilos (a cor da fonte é o que importa; o fundo é só enfeite)

    private static final class Estilos {
        final XSSFCellStyle preto;
        final XSSFCellStyle verdeTema;
        final XSSFCellStyle verdeRgb;
        final XSSFCellStyle vermelho;
        final XSSFCellStyle pretoComFundoVerde;

        Estilos(XSSFWorkbook wb) {
            preto = estilo(wb, f -> f.setThemeColor((short) 1));
            verdeTema = estilo(wb, f -> f.setThemeColor((short) 9)); // accent6
            verdeRgb = estilo(wb, f -> f.setColor(argb(0xFF, 0x70, 0xAD, 0x47)));
            vermelho = estilo(wb, f -> f.setColor(argb(0xFF, 0xC0, 0x00, 0x00)));

            pretoComFundoVerde = estilo(wb, f -> f.setThemeColor((short) 1));
            XSSFColor fundo = new XSSFColor();
            fundo.setTheme(9);
            pretoComFundoVerde.setFillForegroundColor(fundo);
            pretoComFundoVerde.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }

        private static XSSFCellStyle estilo(XSSFWorkbook wb, Consumer<XSSFFont> corDaFonte) {
            XSSFFont fonte = wb.createFont();
            corDaFonte.accept(fonte);
            XSSFCellStyle estilo = wb.createCellStyle();
            estilo.setFont(fonte);
            return estilo;
        }

        private static XSSFColor argb(int a, int r, int g, int b) {
            return new XSSFColor(new byte[] {(byte) a, (byte) r, (byte) g, (byte) b});
        }
    }
}
