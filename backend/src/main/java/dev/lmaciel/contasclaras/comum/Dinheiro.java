package dev.lmaciel.contasclaras.comum;

import java.math.BigDecimal;

/**
 * Regras de valor em dinheiro que cabem em {@code numeric(12,2)}: positivo, até 9.999.999.999,99 e no
 * máximo 2 casas decimais. A API rejeita (400) em vez de arredondar.
 */
public final class Dinheiro {

    static final String VALOR_INVALIDO = "Valor inválido.";

    private static final BigDecimal MAXIMO = new BigDecimal("9999999999.99");

    private Dinheiro() {
    }

    public static void validar(BigDecimal v) {
        if (v == null || v.signum() <= 0 || v.scale() > 2 || v.compareTo(MAXIMO) > 0) {
            throw new RequisicaoInvalidaException(VALOR_INVALIDO);
        }
    }
}
