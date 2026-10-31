package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;

/** Soma dos lançamentos de uma categoria num mês (resultado agregado, sem entidades). */
public record TotalCategoria(long categoriaId, String nome, BigDecimal total) {
}
