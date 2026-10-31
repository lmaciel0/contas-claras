package dev.lmaciel.contasclaras.cartao;

import java.math.BigDecimal;

/** Faixa de cor do uso do limite: até 50% verde, até 80% amarelo, acima vermelho; sem limite não há uso. */
public enum FaixaUso {
    VERDE,
    AMARELO,
    VERMELHO,
    SEM_LIMITE;

    private static final BigDecimal LIMITE_VERDE = new BigDecimal("0.50");
    private static final BigDecimal LIMITE_AMARELO = new BigDecimal("0.80");

    /** {@code uso} é a fração do limite gasta (0.7300 = 73%); {@code null} quando o cartão não tem limite. */
    public static FaixaUso de(BigDecimal uso) {
        if (uso == null) {
            return SEM_LIMITE;
        }
        if (uso.compareTo(LIMITE_VERDE) <= 0) {
            return VERDE;
        }
        return uso.compareTo(LIMITE_AMARELO) <= 0 ? AMARELO : VERMELHO;
    }
}
