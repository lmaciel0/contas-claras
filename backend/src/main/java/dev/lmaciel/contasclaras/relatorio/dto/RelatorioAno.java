package dev.lmaciel.contasclaras.relatorio.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Relatório do ano: categorias de receita primeiro, depois as de despesa, cada uma na sua ordem. As listas
 * por mês têm 12 valores (janeiro a dezembro); {@code diferenca} é receitas menos despesas.
 */
public record RelatorioAno(
        int ano,
        List<CategoriaAno> categorias,
        List<BigDecimal> receitasMes,
        List<BigDecimal> despesasMes,
        List<BigDecimal> diferencaMes,
        BigDecimal receitasAno,
        BigDecimal despesasAno,
        BigDecimal diferencaAno) {
}
