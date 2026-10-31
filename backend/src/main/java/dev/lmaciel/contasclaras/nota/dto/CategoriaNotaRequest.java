package dev.lmaciel.contasclaras.nota.dto;

import dev.lmaciel.contasclaras.nota.TextoSeguro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Corpo do POST e do PUT. A cor é conferida contra a paleta no serviço. */
public record CategoriaNotaRequest(
        @NotBlank(message = CategoriaNotaRequest.NOME_OBRIGATORIO)
        @Size(max = 40, message = CategoriaNotaRequest.NOME_LONGO)
        @Pattern(regexp = TextoSeguro.TEM_CARACTERE_PROIBIDO, message = CategoriaNotaRequest.NOME_INVALIDO)
        String nome,

        @NotBlank(message = CategoriaNotaRequest.COR_OBRIGATORIA)
        String cor) {

    public static final String NOME_OBRIGATORIO = "Informe o nome da categoria.";
    public static final String NOME_LONGO = "O nome da categoria deve ter até 40 caracteres.";
    public static final String NOME_INVALIDO = "O nome da categoria contém caracteres inválidos.";
    public static final String COR_OBRIGATORIA = "Informe a cor da categoria.";

    /** Espaços nas pontas do nome (inclusive não separáveis) são ignorados antes da validação. */
    public CategoriaNotaRequest {
        nome = TextoSeguro.limpar(nome);
    }
}
