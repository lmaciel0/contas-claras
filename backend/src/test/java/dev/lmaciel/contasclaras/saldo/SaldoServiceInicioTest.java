package dev.lmaciel.contasclaras.saldo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Valida o app.saldo.inicio na construção do serviço (sem contexto Spring). */
class SaldoServiceInicioTest {

    @ParameterizedTest
    @ValueSource(strings = { "2026/11", "", "abc", "1999-12", "2101-01" })
    void inicioInvalidoFalhaComMensagemClara(String inicio) {
        assertThatThrownBy(() -> new SaldoService(null, inicio))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("app.saldo.inicio deve ser AAAA-MM, recebido: " + inicio);
    }

    @Test
    void inicioValidoEhAceito() {
        assertThat(new SaldoService(null, "2026-11")).isNotNull();
    }
}
