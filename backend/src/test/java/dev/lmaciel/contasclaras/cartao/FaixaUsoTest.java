package dev.lmaciel.contasclaras.cartao;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class FaixaUsoTest {

    @Test
    void ate_meio_e_verde() {
        assertThat(FaixaUso.de(new BigDecimal("0.0000"))).isEqualTo(FaixaUso.VERDE);
        assertThat(FaixaUso.de(new BigDecimal("0.50"))).isEqualTo(FaixaUso.VERDE);
        assertThat(FaixaUso.de(new BigDecimal("0.5000"))).isEqualTo(FaixaUso.VERDE);
    }

    @Test
    void acima_de_meio_ate_oitenta_por_cento_e_amarelo() {
        assertThat(FaixaUso.de(new BigDecimal("0.5001"))).isEqualTo(FaixaUso.AMARELO);
        assertThat(FaixaUso.de(new BigDecimal("0.80"))).isEqualTo(FaixaUso.AMARELO);
        assertThat(FaixaUso.de(new BigDecimal("0.8000"))).isEqualTo(FaixaUso.AMARELO);
    }

    @Test
    void acima_de_oitenta_por_cento_e_vermelho() {
        assertThat(FaixaUso.de(new BigDecimal("0.8001"))).isEqualTo(FaixaUso.VERMELHO);
        assertThat(FaixaUso.de(new BigDecimal("0.81"))).isEqualTo(FaixaUso.VERMELHO);
        assertThat(FaixaUso.de(new BigDecimal("1.2500"))).isEqualTo(FaixaUso.VERMELHO);
    }

    @Test
    void sem_uso_e_sem_limite() {
        assertThat(FaixaUso.de(null)).isEqualTo(FaixaUso.SEM_LIMITE);
    }
}
