package dev.lmaciel.aprumo.auth.dto;

import jakarta.validation.constraints.Size;

/**
 * Reautenticação para excluir a conta: exatamente um dos dois campos preenchido (a regra fica no serviço).
 * {@code senha} para contas com senha; {@code credencialGoogle} é o ID token do Google, para contas só com Google.
 */
public record ExcluirContaRequest(
        @Size(max = 1024, message = "Senha incorreta.")
        String senha,

        @Size(max = 8192, message = "Login Google inválido.")
        String credencialGoogle) {
}
