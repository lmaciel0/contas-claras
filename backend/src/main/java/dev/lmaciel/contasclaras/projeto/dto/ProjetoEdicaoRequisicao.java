package dev.lmaciel.contasclaras.projeto.dto;

import dev.lmaciel.contasclaras.projeto.CorProjeto;
import dev.lmaciel.contasclaras.projeto.PrioridadeProjeto;
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
