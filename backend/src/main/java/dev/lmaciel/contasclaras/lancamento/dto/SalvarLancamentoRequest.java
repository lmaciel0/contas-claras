package dev.lmaciel.contasclaras.lancamento.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import dev.lmaciel.contasclaras.lancamento.StatusLancamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Corpo do PUT: salva (cria ou edita) o lançamento do item no mês. {@code valor} é checado por
 * {@code Dinheiro.validar} no serviço (ausente, zero, grande demais ou com mais de 2 casas: "Valor inválido.").
 * Sem {@code vencimento}, vale o dia do item. {@code repetirAte} cria previstos nos meses seguintes.
 */
public record SalvarLancamentoRequest(
        @NotNull(message = "Informe o item.")
        Long itemId,

        @NotNull(message = "Informe o ano.")
        @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
        @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.")
        Integer ano,

        @NotNull(message = "Informe o mês.")
        @Min(value = 1, message = "O mês deve estar entre 1 e 12.")
        @Max(value = 12, message = "O mês deve estar entre 1 e 12.")
        Integer mes,

        BigDecimal valor,

        @NotNull(message = "Informe o status.")
        StatusLancamento status,

        LocalDate vencimento,

        @Valid
        MesAno repetirAte) {
}
