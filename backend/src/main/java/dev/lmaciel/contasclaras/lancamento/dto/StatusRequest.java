package dev.lmaciel.contasclaras.lancamento.dto;

import dev.lmaciel.contasclaras.lancamento.StatusLancamento;
import jakarta.validation.constraints.NotNull;

public record StatusRequest(
        @NotNull(message = "Informe o status.")
        StatusLancamento status) {
}
