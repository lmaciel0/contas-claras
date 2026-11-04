package dev.lmaciel.aprumo.lancamento.dto;

import dev.lmaciel.aprumo.lancamento.StatusLancamento;
import jakarta.validation.constraints.NotNull;

public record StatusRequest(
        @NotNull(message = "Informe o status.")
        StatusLancamento status) {
}
