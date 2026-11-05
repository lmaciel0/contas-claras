package dev.lmaciel.aprumo.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Reautenticação conforme a conta (a regra fica no serviço): quem já tem senha informa {@code senhaAtual}
 * ({@code credencialGoogle} é ignorada); conta só com Google informa {@code credencialGoogle}, o ID token
 * do Google da própria conta ({@code senhaAtual} é ignorada).
 */
public record DefinirSenhaRequest(
        @Size(max = 1024, message = "Senha atual incorreta.")
        String senhaAtual,

        @Size(max = 8192, message = "Login Google inválido.")
        String credencialGoogle,

        @NotNull(message = "Informe a senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String senha) {
}
