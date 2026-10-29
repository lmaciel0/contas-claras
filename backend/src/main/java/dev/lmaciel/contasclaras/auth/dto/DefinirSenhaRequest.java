package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DefinirSenhaRequest(
        @NotNull(message = "Informe a senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String senha) {
}
