package dev.lmaciel.contasclaras.relatorio.dto;

import java.math.BigDecimal;
import java.util.List;

/** Um item no relatório do ano: 12 células (janeiro a dezembro, {@code null} sem lançamento) e a soma. */
public record ItemAno(long itemId, String nome, List<CelulaMes> meses, BigDecimal total) {
}
