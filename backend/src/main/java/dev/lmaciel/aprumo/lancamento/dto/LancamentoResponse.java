package dev.lmaciel.aprumo.lancamento.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import dev.lmaciel.aprumo.categoria.Categoria;
import dev.lmaciel.aprumo.categoria.TipoCategoria;
import dev.lmaciel.aprumo.item.Item;
import dev.lmaciel.aprumo.lancamento.Lancamento;
import dev.lmaciel.aprumo.lancamento.StatusLancamento;

public record LancamentoResponse(
        long id,
        long itemId,
        String itemNome,
        long categoriaId,
        String categoriaNome,
        TipoCategoria tipo,
        int ano,
        int mes,
        BigDecimal valor,
        StatusLancamento status,
        LocalDate vencimento) {

    /** Espera item e categoria já carregados (as consultas do repositório trazem os dois com fetch join). */
    public static LancamentoResponse de(Lancamento l) {
        Item item = l.getItem();
        Categoria categoria = item.getCategoria();
        return new LancamentoResponse(l.getId(), item.getId(), item.getNome(), categoria.getId(),
                categoria.getNome(), categoria.getTipo(), l.getAno(), l.getMes(), l.getValor(), l.getStatus(),
                l.getVencimento());
    }
}
