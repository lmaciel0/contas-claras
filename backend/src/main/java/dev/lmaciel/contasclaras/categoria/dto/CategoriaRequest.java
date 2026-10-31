package dev.lmaciel.contasclaras.categoria.dto;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do POST (criar) e do PUT (renomear). {@code tipo} é obrigatório só na criação; o PUT o ignora,
 * porque o tipo de uma categoria não muda.
 */
public record CategoriaRequest(
        @NotBlank(message = "Informe o nome da categoria.")
        @Size(max = 80, message = "O nome da categoria deve ter até 80 caracteres.")
        String nome,

        TipoCategoria tipo) {

    /** Espaços nas pontas do nome são ignorados antes da validação (e da checagem de duplicidade). */
    public CategoriaRequest {
        nome = nome == null ? null : nome.trim();
    }
}
