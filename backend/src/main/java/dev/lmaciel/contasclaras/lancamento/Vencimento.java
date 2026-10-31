package dev.lmaciel.contasclaras.lancamento;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Vencimento padrão de um lançamento: o dia do item no mês pedido.
 */
public final class Vencimento {

    private Vencimento() {
    }

    /**
     * Sem dia, não há vencimento ({@code null}). Dia maior que o mês (31 em abril, 30 em fevereiro) vira o
     * último dia do mês.
     */
    public static LocalDate padrao(int ano, int mes, Integer dia) {
        if (dia == null) {
            return null;
        }
        YearMonth anoMes = YearMonth.of(ano, mes);
        return anoMes.atDay(Math.min(dia, anoMes.lengthOfMonth()));
    }
}
