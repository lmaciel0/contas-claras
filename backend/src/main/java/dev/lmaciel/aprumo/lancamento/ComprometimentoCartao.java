package dev.lmaciel.aprumo.lancamento;

import java.math.BigDecimal;

/** Total de lançamentos não pagos (previstos) de um cartão que comprometem o limite. */
public record ComprometimentoCartao(long itemId, BigDecimal comprometido) {
}
