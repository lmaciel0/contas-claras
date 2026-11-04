package dev.lmaciel.aprumo.tarefa.dto;

import jakarta.validation.constraints.NotNull;

public record ConcluirRequest(@NotNull Boolean concluida) {
}
