package dev.lmaciel.contasclaras.nota.dto;

import java.time.Instant;

import dev.lmaciel.contasclaras.nota.Nota;
import tools.jackson.databind.JsonNode;

public record NotaResponse(
        long id,
        String titulo,
        JsonNode conteudo,
        Long categoriaId,
        boolean fixada,
        Instant criadoEm,
        Instant atualizadoEm) {

    public static NotaResponse de(Nota nota, JsonNode conteudo) {
        // getId() de um proxy preguiçoso não carrega a categoria.
        Long categoriaId = nota.getCategoria() == null ? null : nota.getCategoria().getId();
        return new NotaResponse(nota.getId(), nota.getTitulo(), conteudo, categoriaId, nota.isFixada(),
                nota.getCriadoEm(), nota.getAtualizadoEm());
    }
}
