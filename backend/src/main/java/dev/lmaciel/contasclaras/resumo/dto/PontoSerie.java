package dev.lmaciel.contasclaras.resumo.dto;

import java.math.BigDecimal;

/** Um mês da série do ano; os campos "previstas" são a parte ainda não paga do total do mesmo lado. */
public record PontoSerie(
        int mes,
        BigDecimal receitas,
        BigDecimal receitasPrevistas,
        BigDecimal despesas,
        BigDecimal despesasPrevistas) {
}
