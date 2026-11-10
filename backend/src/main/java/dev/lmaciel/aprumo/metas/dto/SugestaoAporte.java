package dev.lmaciel.aprumo.metas.dto;

public record SugestaoAporte(
        Long metaId,
        String nome,
        String valorSugerido,
        Integer mesesRestantes
) {
}
