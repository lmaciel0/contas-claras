package dev.lmaciel.contasclaras.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Confirma o cadastro por {@code email} e {@code codigo} ou só por {@code token} (o do link), e define a
 * {@code senha} da conta. Que um dos dois pares venha preenchido é regra do controller, porque a validação
 * declarativa não cobre o "ou".
 */
public record ConfirmarCadastroRequest(
        @Size(max = 254, message = "O e-mail deve ter até 254 caracteres.")
        String email,

        @Pattern(regexp = "\\d{6}", message = "Código inválido ou expirado.")
        String codigo,

        @Size(max = 64, message = "Código inválido ou expirado.")
        String token,

        @NotNull(message = "Informe a senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String senha) {

    public ConfirmarCadastroRequest {
        email = email == null ? null : email.trim();
    }
}
