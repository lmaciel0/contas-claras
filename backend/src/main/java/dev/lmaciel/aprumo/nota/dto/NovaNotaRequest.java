package dev.lmaciel.aprumo.nota.dto;

/** Corpo do POST: só a categoria inicial, opcional. */
public record NovaNotaRequest(Long categoriaId) {
}
