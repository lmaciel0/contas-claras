package dev.lmaciel.contasclaras.resumo.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Dados da tela Início. {@code anterior} é {@code null} quando o mês anterior não tem nenhum lançamento
 * (a tela esconde a comparação em vez de mostrar zeros).
 */
public record ResumoMes(
        BigDecimal receitas,
        BigDecimal despesas,
        BigDecimal sobra,
        BigDecimal sobraAno,
        TotaisMes anterior,
        List<CategoriaTotal> categorias,
        List<ProximaConta> proximas,
        List<PontoSerie> serieAno) {
}
