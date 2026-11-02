package dev.lmaciel.contasclaras.categoria.dto;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do POST (criar) e do PUT (renomear/atualizar). {@code tipo} é obrigatório só na criação; o PUT o ignora,
 * porque o tipo de uma categoria não muda.
 */
public record CategoriaRequest(
        @NotBlank(message = "Informe o nome da categoria.")
        @Size(max = 80, message = "O nome da categoria deve ter até 80 caracteres.")
        String nome,

        TipoCategoria tipo,

        @Size(max = 50, message = "O ícone deve ter até 50 caracteres.")
        String icone,

        @Size(max = 30, message = "A cor deve ter até 30 caracteres.")
        String cor) {

    public CategoriaRequest(String nome, TipoCategoria tipo) {
        this(nome, tipo, null, null);
    }

    /** Espaços nas pontas são ignorados antes da validação. */
    public CategoriaRequest {
        nome = nome == null ? null : nome.trim();
        icone = icone == null ? null : icone.trim();
        cor = cor == null ? null : cor.trim();
    }
}
