package dev.lmaciel.aprumo.lancamento;

import java.math.BigDecimal;

/** Valor lançado para um item num mês (resultado agregado, sem entidades). */
public record FaturaItem(long itemId, BigDecimal valor, StatusLancamento status) {

    public FaturaItem(long itemId, BigDecimal valor) {
        this(itemId, valor, StatusLancamento.PREVISTO);
    }

    public boolean pago() {
        return status == StatusLancamento.PAGO;
    }
}
