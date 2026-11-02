package dev.lmaciel.contasclaras.projeto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubtarefaCriacaoRequisicao(
        @NotBlank(message = "O título da subtarefa é obrigatório")
        @Size(max = 200, message = "O título da subtarefa deve ter no máximo 200 caracteres")
        String titulo
) {
}
