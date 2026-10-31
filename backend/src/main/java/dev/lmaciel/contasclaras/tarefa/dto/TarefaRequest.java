package dev.lmaciel.contasclaras.tarefa.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TarefaRequest(
        @NotBlank(message = TarefaRequest.TITULO_OBRIGATORIO)
        @Size(max = 200, message = TarefaRequest.TITULO_LONGO)
        @Pattern(regexp = "[^\\u0000]*", message = TarefaRequest.TITULO_INVALIDO)
        String titulo,

        LocalDate data) {

    public static final String TITULO_OBRIGATORIO = "Informe o título da tarefa.";
    public static final String TITULO_LONGO = "O título da tarefa deve ter até 200 caracteres.";

    public static final String TITULO_INVALIDO = "O título da tarefa contém caracteres inválidos.";
    public static final String DATA_FORA_DO_INTERVALO = "A data deve estar entre os anos 1900 e 2200.";

    private static final int ANO_MINIMO = 1900;
    private static final int ANO_MAXIMO = 2200;

    /** Espaços nas pontas do título são ignorados antes da validação. */
    public TarefaRequest {
        titulo = titulo == null ? null : titulo.trim();
    }

    /** Datas extremas estouram o tipo {@code date} do Postgres; a data é opcional. */
    @JsonIgnore
    @AssertTrue(message = TarefaRequest.DATA_FORA_DO_INTERVALO)
    public boolean isDataNoIntervalo() {
        return data == null || (data.getYear() >= ANO_MINIMO && data.getYear() <= ANO_MAXIMO);
    }
}
