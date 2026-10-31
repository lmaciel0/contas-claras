package dev.lmaciel.contasclaras.nota.dto;

import dev.lmaciel.contasclaras.nota.TextoSeguro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** Corpo do PUT: substitui título, conteúdo e categoria. O conteúdo é conferido por {@code ConteudoNota}. */
public record NotaRequest(
        @NotBlank(message = NotaRequest.TITULO_OBRIGATORIO)
        @Size(max = 200, message = NotaRequest.TITULO_LONGO)
        @Pattern(regexp = TextoSeguro.TEM_CARACTERE_PROIBIDO, message = NotaRequest.TITULO_INVALIDO)
        String titulo,

        @NotNull(message = NotaRequest.CONTEUDO_OBRIGATORIO)
        JsonNode conteudo,

        Long categoriaId) {

    public static final String TITULO_OBRIGATORIO = "Informe o título da nota.";
    public static final String TITULO_LONGO = "O título da nota deve ter até 200 caracteres.";
    public static final String TITULO_INVALIDO = "O título da nota contém caracteres inválidos.";
    public static final String CONTEUDO_OBRIGATORIO = "Informe o conteúdo da nota.";

    /** Espaços nas pontas do título (inclusive não separáveis) são ignorados antes da validação. */
    public NotaRequest {
        titulo = TextoSeguro.limpar(titulo);
    }
}
