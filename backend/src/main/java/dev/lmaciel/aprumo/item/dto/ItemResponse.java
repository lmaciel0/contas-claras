package dev.lmaciel.aprumo.item.dto;

import java.math.BigDecimal;

import dev.lmaciel.aprumo.item.Item;

public record ItemResponse(
        long id,
        String nome,
        Integer diaVencimento,
        boolean cartao,
        BigDecimal limite,
        boolean arquivado,
        String titular) {

    public static ItemResponse de(Item item) {
        return new ItemResponse(item.getId(), item.getNome(), item.getDiaVencimento(), item.isCartao(),
                item.getLimite(), item.isArquivado(), item.getTitular());
    }
}
