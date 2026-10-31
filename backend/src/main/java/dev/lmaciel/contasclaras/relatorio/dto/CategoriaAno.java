package dev.lmaciel.contasclaras.relatorio.dto;

import java.math.BigDecimal;
import java.util.List;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;

/** Itens com lançamento no ano de uma categoria; {@code totaisMes} tem 12 valores (0.00 nos meses vazios). */
public record CategoriaAno(
        long categoriaId,
        String nome,
        TipoCategoria tipo,
        List<ItemAno> itens,
        List<BigDecimal> totaisMes,
        BigDecimal total) {
}
