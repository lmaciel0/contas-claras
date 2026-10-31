package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Informe o e-mail.")
        @Size(max = 254, message = "E-mail ou senha inválidos.")
        String email,

        @NotNull(message = "Informe a senha.")
        @Size(max = 1024, message = "E-mail ou senha inválidos.")
        String senha) {

    public LoginRequest {
        email = email == null ? null : email.trim();
    }
}
