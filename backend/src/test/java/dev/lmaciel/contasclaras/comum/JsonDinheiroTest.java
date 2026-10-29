package dev.lmaciel.contasclaras.comum;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import dev.lmaciel.contasclaras.IntegracaoTest;
import tools.jackson.databind.json.JsonMapper;

class JsonDinheiroTest extends IntegracaoTest {

    record Valor(BigDecimal valor) {
    }

    @Autowired
    JsonMapper json;

    @Test
    void escreve_bigdecimal_como_string_decimal() {
        assertThat(json.writeValueAsString(new Valor(new BigDecimal("1234.56"))))
                .isEqualTo("{\"valor\":\"1234.56\"}");
    }

    @Test
    void escreve_bigdecimal_sem_notacao_cientifica() {
        assertThat(json.writeValueAsString(new Valor(new BigDecimal("1E+3"))))
                .isEqualTo("{\"valor\":\"1000\"}");
        assertThat(json.writeValueAsString(new Valor(new BigDecimal("0.0000001"))))
                .isEqualTo("{\"valor\":\"0.0000001\"}");
    }

    @Test
    void le_bigdecimal_de_string() {
        assertThat(json.readValue("{\"valor\":\"1234.56\"}", Valor.class).valor())
                .isEqualTo(new BigDecimal("1234.56"));
    }

    @Test
    void le_bigdecimal_de_numero() {
        assertThat(json.readValue("{\"valor\":1234.56}", Valor.class).valor())
                .isEqualTo(new BigDecimal("1234.56"));
    }
}
