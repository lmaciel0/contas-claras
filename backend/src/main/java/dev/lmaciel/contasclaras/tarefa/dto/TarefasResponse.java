package dev.lmaciel.contasclaras.tarefa.dto;

import java.time.LocalDate;
import java.util.List;

public record TarefasResponse(
        LocalDate hoje,
        List<TarefaResponse> atrasadas,
        List<TarefaResponse> deHoje,
        List<TarefaResponse> proximas,
        List<TarefaResponse> concluidasHoje,
        List<TarefaResponse> concluidas,
        long totalConcluidas) {
}
