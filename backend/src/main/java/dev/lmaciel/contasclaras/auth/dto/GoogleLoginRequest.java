package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank(message = "Informe a credencial do Google.")
        @Size(max = 8192, message = "Login Google inválido.")
        String credential) {
}
