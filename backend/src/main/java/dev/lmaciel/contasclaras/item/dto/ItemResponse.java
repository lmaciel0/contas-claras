package dev.lmaciel.contasclaras.item.dto;

import java.math.BigDecimal;

import dev.lmaciel.contasclaras.item.Item;

public record ItemResponse(
        long id,
        String nome,
        Integer diaVencimento,
        boolean cartao,
        BigDecimal limite,
        boolean arquivado) {

    public static ItemResponse de(Item item) {
        return new ItemResponse(item.getId(), item.getNome(), item.getDiaVencimento(), item.isCartao(),
                item.getLimite(), item.isArquivado());
    }
}
