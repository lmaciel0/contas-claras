package dev.lmaciel.contasclaras.cartao.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cartões ativos do mês, da maior fatura para a menor. {@code totalFaturas} soma todos os cartões;
 * {@code limiteTotal} e {@code usoGeral} consideram só os que têm limite, e {@code usoGeral} é
 * {@code null} quando nenhum tem (não há divisor).
 */
public record CartoesMes(
        BigDecimal totalFaturas,
        BigDecimal limiteTotal,
        BigDecimal usoGeral,
        List<CartaoUso> cartoes) {
}
