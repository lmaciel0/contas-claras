package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo dos pedidos que só informam o e-mail (reenviar cadastro, esqueci a senha). */
public record EmailRequest(
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter até 254 caracteres.")
        String email) {

    /** Espaços nas pontas do e-mail são ignorados antes da validação. */
    public EmailRequest {
        email = email == null ? null : email.trim();
    }
}
