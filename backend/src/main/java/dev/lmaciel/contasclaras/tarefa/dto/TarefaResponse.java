package dev.lmaciel.contasclaras.tarefa.dto;

import java.time.Instant;
import java.time.LocalDate;

import dev.lmaciel.contasclaras.tarefa.Tarefa;

public record TarefaResponse(
        long id,
        String titulo,
        LocalDate data,
        boolean concluida,
        Instant concluidaEm) {

    public static TarefaResponse de(Tarefa tarefa) {
        return new TarefaResponse(tarefa.getId(), tarefa.getTitulo(), tarefa.getData(), tarefa.isConcluida(),
                tarefa.getConcluidaEm());
    }
}
