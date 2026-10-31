package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter até 254 caracteres.")
        String email,

        @NotNull(message = "Código inválido ou expirado.")
        @Pattern(regexp = "\\d{6}", message = "Código inválido ou expirado.")
        String codigo,

        @NotNull(message = "Informe a senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String senha) {

    /** Espaços nas pontas do e-mail são ignorados antes da validação. */
    public RedefinirSenhaRequest {
        email = email == null ? null : email.trim();
    }
}
