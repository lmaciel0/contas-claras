package dev.lmaciel.aprumo.lancamento;

import java.math.BigDecimal;

import dev.lmaciel.aprumo.categoria.TipoCategoria;

/** Soma dos lançamentos de um período por tipo da categoria (resultado agregado, sem entidades). */
public record TotalTipo(TipoCategoria tipo, BigDecimal total) {
}
