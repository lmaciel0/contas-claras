package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * {@code senhaAtual} é obrigatória para quem já tem senha (a regra fica no serviço); contas só com
 * Google definem a primeira senha sem ela.
 */
public record DefinirSenhaRequest(
        @Size(max = 1024, message = "Senha atual incorreta.")
        String senhaAtual,

        @NotNull(message = "Informe a senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String senha) {
}
