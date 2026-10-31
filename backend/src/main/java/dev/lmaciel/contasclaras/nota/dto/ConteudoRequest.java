package dev.lmaciel.contasclaras.nota.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

/** Corpo do PATCH /{id}/conteudo: troca só o conteúdo (caixinhas do card da home). */
public record ConteudoRequest(@NotNull(message = NotaRequest.CONTEUDO_OBRIGATORIO) JsonNode conteudo) {
}
