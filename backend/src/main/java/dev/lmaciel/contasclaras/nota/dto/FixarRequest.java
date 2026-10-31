package dev.lmaciel.contasclaras.nota.dto;

import jakarta.validation.constraints.NotNull;

/** Corpo do PATCH /{id}/fixada. */
public record FixarRequest(@NotNull(message = FixarRequest.FIXADA_OBRIGATORIA) Boolean fixada) {

    public static final String FIXADA_OBRIGATORIA = "Informe se a nota fica fixada.";
}
