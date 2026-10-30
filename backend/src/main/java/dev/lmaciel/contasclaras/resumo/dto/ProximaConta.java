package dev.lmaciel.contasclaras.resumo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Despesa ainda não paga, com vencimento em atraso ou nos próximos 30 dias. */
public record ProximaConta(
        long lancamentoId,
        String itemNome,
        String categoriaNome,
        BigDecimal valor,
        LocalDate vencimento,
        boolean atrasada) {
}
