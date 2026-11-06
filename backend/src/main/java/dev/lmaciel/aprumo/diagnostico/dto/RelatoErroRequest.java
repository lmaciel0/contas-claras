package dev.lmaciel.aprumo.diagnostico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Relato de erro do front. A {@code rota} é só o caminho (sem query string nem fragmento), para não carregar
 * dado pessoal na URL.
 */
public record RelatoErroRequest(
        @NotBlank @Size(max = 500) String mensagem,
        @Size(max = 4000) String pilha,
        @NotBlank @Size(max = 200) @Pattern(regexp = "^/[^?#]*$") String rota) {
}
