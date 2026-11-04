package dev.lmaciel.aprumo.resumo.dto;

import java.math.BigDecimal;

/** Receitas, despesas (pagas e previstas) e a sobra de um mês. */
public record TotaisMes(BigDecimal receitas, BigDecimal despesas, BigDecimal sobra) {
}
