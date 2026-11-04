package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;

/** Soma dos lançamentos de um período por tipo da categoria (resultado agregado, sem entidades). */
public record TotalTipo(TipoCategoria tipo, BigDecimal total) {
}
