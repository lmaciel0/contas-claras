package dev.lmaciel.contasclaras.lancamento;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class VencimentoTest {

    @Test
    void dia_31_em_fevereiro_vira_ultimo_dia() {
        assertThat(Vencimento.padrao(2026, 2, 31)).isEqualTo(LocalDate.of(2026, 2, 28));
    }

    @Test
    void dia_30_em_fevereiro_bissexto_vira_29() {
        assertThat(Vencimento.padrao(2028, 2, 30)).isEqualTo(LocalDate.of(2028, 2, 29));
    }

    @Test
    void dia_31_em_mes_de_30_dias_vira_30() {
        assertThat(Vencimento.padrao(2026, 4, 31)).isEqualTo(LocalDate.of(2026, 4, 30));
    }

    @Test
    void dia_que_cabe_no_mes_fica_como_esta() {
        assertThat(Vencimento.padrao(2026, 11, 20)).isEqualTo(LocalDate.of(2026, 11, 20));
        assertThat(Vencimento.padrao(2026, 1, 31)).isEqualTo(LocalDate.of(2026, 1, 31));
    }

    @Test
    void sem_dia_nao_ha_vencimento() {
        assertThat(Vencimento.padrao(2026, 4, null)).isNull();
    }
}
