package dev.lmaciel.contasclaras.relatorio.dto;

import java.math.BigDecimal;

import dev.lmaciel.contasclaras.lancamento.StatusLancamento;

/** Lançamento de um item num mês; no relatório, mês sem lançamento é {@code null}, não uma célula zerada. */
public record CelulaMes(BigDecimal valor, StatusLancamento status) {
}
