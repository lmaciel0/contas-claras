package dev.lmaciel.contasclaras.importacao;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NomeNormalizadoTest {

    @Test
    void chave_poe_em_maiusculas_tira_acento_e_colapsa_espacos() {
        assertThat(NomeNormalizado.chave("  Cartões  de Crédito ")).isEqualTo("CARTOES DE CREDITO");
    }

    @Test
    void chave_trata_espaco_sem_quebra_como_espaco() {
        assertThat(NomeNormalizado.chave("Cartões de  Crédito")).isEqualTo("CARTOES DE CREDITO");
    }

    @Test
    void chave_aplica_o_alias_de_dividas() {
        assertThat(NomeNormalizado.chave("DIVIDAS")).isEqualTo("DIVIDAS/EMPRESTIMOS");
        assertThat(NomeNormalizado.chave("Dívidas")).isEqualTo("DIVIDAS/EMPRESTIMOS");
        assertThat(NomeNormalizado.chave("DIVIDAS/EMPRESTIMOS")).isEqualTo("DIVIDAS/EMPRESTIMOS");
    }

    @Test
    void chave_de_nulo_ou_branco_e_vazia() {
        assertThat(NomeNormalizado.chave(null)).isEmpty();
        assertThat(NomeNormalizado.chave("   ")).isEmpty();
    }

    @Test
    void separa_o_dia_de_vencimento_do_sufixo() {
        assertThat(NomeNormalizado.separarVencimento("LUZ (10)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("LUZ", 10));
        assertThat(NomeNormalizado.separarVencimento("  CARTAO X(05) "))
                .isEqualTo(new NomeNormalizado.NomeSeparado("CARTAO X", 5));
        assertThat(NomeNormalizado.separarVencimento("X (31)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("X", 31));
    }

    @Test
    void parenteses_nao_numericos_ficam_no_nome() {
        assertThat(NomeNormalizado.separarVencimento("LICENCIAMENTO (JUNHO)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("LICENCIAMENTO (JUNHO)", null));
    }

    @Test
    void dia_fora_de_1_a_31_fica_no_nome() {
        assertThat(NomeNormalizado.separarVencimento("X (45)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("X (45)", null));
        assertThat(NomeNormalizado.separarVencimento("X (00)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("X (00)", null));
        assertThat(NomeNormalizado.separarVencimento("X (32)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("X (32)", null));
    }

    @Test
    void sufixo_sem_nome_nao_e_separado() {
        assertThat(NomeNormalizado.separarVencimento("(10)"))
                .isEqualTo(new NomeNormalizado.NomeSeparado("(10)", null));
    }
}
