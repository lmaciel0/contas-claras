package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;

/** Soma dos lançamentos de um mês, por tipo da categoria e status (resultado agregado, sem entidades). */
public record TotalMensal(int mes, TipoCategoria tipo, StatusLancamento status, BigDecimal total) {
}
