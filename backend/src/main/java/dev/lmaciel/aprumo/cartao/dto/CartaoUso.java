package dev.lmaciel.aprumo.cartao.dto;

import java.math.BigDecimal;

import dev.lmaciel.aprumo.cartao.FaixaUso;

/**
 * Fatura e comprometimento do limite de um cartão no mês.
 * {@code fatura} é o valor da fatura no mês selecionado.
 * {@code faturaPaga} indica se o lançamento do mês selecionado já foi pago.
 * {@code limiteUsado} soma todos os lançamentos em aberto (previstos) deste cartão (atuais, futuros e pendentes).
 * {@code limiteDisponivel} é {@code limite - limiteUsado} (mínimo 0), ou {@code null} se sem limite.
 * {@code uso} e {@code faixa} são calculados sobre o {@code limiteUsado}.
 */
public record CartaoUso(
        long itemId,
        String nome,
        Integer diaVencimento,
        BigDecimal fatura,
        BigDecimal limite,
        BigDecimal uso,
        FaixaUso faixa,
        String titular,
        long categoriaId,
        BigDecimal limiteDisponivel,
        BigDecimal limiteUsado,
        boolean faturaPaga) {

    public CartaoUso(
            long itemId,
            String nome,
            Integer diaVencimento,
            BigDecimal fatura,
            BigDecimal limite,
            BigDecimal uso,
            FaixaUso faixa,
            String titular,
            long categoriaId) {
        this(
                itemId,
                nome,
                diaVencimento,
                fatura,
                limite,
                uso,
                faixa,
                titular,
                categoriaId,
                limite != null && fatura != null ? limite.subtract(fatura).max(BigDecimal.ZERO) : null,
                fatura,
                false);
    }
}
