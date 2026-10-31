package dev.lmaciel.contasclaras.nota.dto;

/** Corpo do POST: só a categoria inicial, opcional. */
public record NovaNotaRequest(Long categoriaId) {
}
