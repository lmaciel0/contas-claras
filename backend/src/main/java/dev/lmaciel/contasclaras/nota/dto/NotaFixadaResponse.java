package dev.lmaciel.contasclaras.nota.dto;

/** Resposta de GET /fixada; {@code nota} é {@code null} quando o usuário não fixou nenhuma. */
public record NotaFixadaResponse(NotaResponse nota) {
}
