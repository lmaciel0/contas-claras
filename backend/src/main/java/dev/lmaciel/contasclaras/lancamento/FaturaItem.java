package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;

/** Valor lançado para um item num mês (resultado agregado, sem entidades). */
public record FaturaItem(long itemId, BigDecimal valor) {
}
