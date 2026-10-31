package dev.lmaciel.contasclaras.categoria.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public record OrdemRequest(
        @NotNull(message = "Informe a lista de categorias.")
        List<@NotNull(message = "A lista de categorias não pode ter itens vazios.") Long> ids) {
}
