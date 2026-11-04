package dev.lmaciel.aprumo.relatorio.dto;

import java.math.BigDecimal;

import dev.lmaciel.aprumo.lancamento.StatusLancamento;

/** Lançamento de um item num mês; no relatório, mês sem lançamento é {@code null}, não uma célula zerada. */
public record CelulaMes(BigDecimal valor, StatusLancamento status) {
}
