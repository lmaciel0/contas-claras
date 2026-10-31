package dev.lmaciel.contasclaras.resumo.dto;

import java.math.BigDecimal;

/** Quanto uma categoria de despesa pesa no mês; {@code percentual} é fração com 4 casas (0.4815 = 48,15%). */
public record CategoriaTotal(long categoriaId, String nome, BigDecimal total, BigDecimal percentual) {
}
