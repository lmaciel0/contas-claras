package dev.lmaciel.aprumo.projeto.dto;

import dev.lmaciel.aprumo.projeto.CorProjeto;
import dev.lmaciel.aprumo.projeto.PrioridadeProjeto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ProjetoEdicaoRequisicao(
        @NotBlank(message = "O título do projeto é obrigatório")
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres")
        String titulo,

        String descricao,

        @Size(max = 50, message = "A categoria deve ter no máximo 50 caracteres")
        String categoria,

        PrioridadeProjeto prioridade,
        CorProjeto cor,
        LocalDate prazo
) {
}
