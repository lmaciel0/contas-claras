package dev.lmaciel.contasclaras.tarefa.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TarefaRequest(
        @NotBlank(message = TarefaRequest.TITULO_OBRIGATORIO)
        @Size(max = 200, message = TarefaRequest.TITULO_LONGO)
        String titulo,

        LocalDate data) {

    public static final String TITULO_OBRIGATORIO = "Informe o título da tarefa.";
    public static final String TITULO_LONGO = "O título da tarefa deve ter até 200 caracteres.";

    /** Espaços nas pontas do título são ignorados antes da validação. */
    public TarefaRequest {
        titulo = titulo == null ? null : titulo.trim();
    }
}
