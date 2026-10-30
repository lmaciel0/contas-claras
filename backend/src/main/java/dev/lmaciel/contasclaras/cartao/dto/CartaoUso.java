package dev.lmaciel.contasclaras.cartao.dto;

import java.math.BigDecimal;

import dev.lmaciel.contasclaras.cartao.FaixaUso;

/**
 * Fatura de um cartão no mês. {@code limite} e {@code uso} (fração com 4 casas, 0.7300 = 73%) são
 * {@code null} quando o cartão não tem limite; a {@code faixa} sai do {@code uso} já arredondado.
 */
public record CartaoUso(
        long itemId,
        String nome,
        Integer diaVencimento,
        BigDecimal fatura,
        BigDecimal limite,
        BigDecimal uso,
        FaixaUso faixa) {
}
