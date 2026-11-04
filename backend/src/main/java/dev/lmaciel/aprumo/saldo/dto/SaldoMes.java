package dev.lmaciel.aprumo.saldo.dto;

import java.math.BigDecimal;

/**
 * Saldo do Itaú no fim do mês e o que entrou nele. Antes do mês de início ({@code ativo = false}) os dois
 * valores são 0.00.
 */
public record SaldoMes(boolean ativo, BigDecimal saldo, BigDecimal recebidoNoMes) {
}
