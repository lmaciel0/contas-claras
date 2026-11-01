package dev.lmaciel.contasclaras.item.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo do POST (criar) e do PUT (substituir). {@code arquivado} é obrigatório só no PUT e é ignorado
 * na criação: item novo nasce ativo.
 */
public record ItemRequest(
        @NotBlank(message = "Informe o nome do item.")
        @Size(max = 120, message = "O nome do item deve ter até 120 caracteres.")
        String nome,

        @Min(value = 1, message = "O dia de vencimento deve estar entre 1 e 31.")
        @Max(value = 31, message = "O dia de vencimento deve estar entre 1 e 31.")
        Integer diaVencimento,

        @NotNull(message = "Informe se o item é um cartão.")
        Boolean cartao,

        @DecimalMin(value = "0", inclusive = false, message = "O limite deve ser maior que zero.")
        @DecimalMax(value = "9999999999.99", message = "O limite deve ser no máximo 9.999.999.999,99.")
        // O teto de dígitos inteiros já é do @DecimalMax; aqui só interessam as casas decimais.
        @Digits(integer = 1000, fraction = 2, message = "O limite deve ter no máximo 2 casas decimais.")
        BigDecimal limite,

        Boolean arquivado,

        @Size(max = 60, message = "O titular deve ter até 60 caracteres.")
        String titular) {

    public ItemRequest(String nome, Integer diaVencimento, Boolean cartao, BigDecimal limite, Boolean arquivado) {
        this(nome, diaVencimento, cartao, limite, arquivado, null);
    }

    /** Espaços nas pontas do nome são ignorados antes da validação (e da checagem de duplicidade). */
    public ItemRequest {
        nome = nome == null ? null : nome.trim();
        titular = titular == null || titular.isBlank() ? null : titular.trim();
    }
}
