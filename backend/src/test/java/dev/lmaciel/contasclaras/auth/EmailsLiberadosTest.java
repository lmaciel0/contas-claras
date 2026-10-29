package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailsLiberadosTest {

    @Test
    void lista_vazia_nao_permite_ninguem() {
        assertThat(new EmailsLiberados("").permite("dono@exemplo.com")).isFalse();
        assertThat(new EmailsLiberados("  ").permite("dono@exemplo.com")).isFalse();
        assertThat(new EmailsLiberados(null).permite("dono@exemplo.com")).isFalse();
    }

    @Test
    void item_vazio_na_lista_nao_libera_email_vazio() {
        EmailsLiberados liberados = new EmailsLiberados("dono@exemplo.com,,");

        assertThat(liberados.permite("")).isFalse();
        assertThat(liberados.permite("   ")).isFalse();
        assertThat(liberados.permite(null)).isFalse();
    }

    @Test
    void comparacao_ignora_maiusculas_e_espacos() {
        EmailsLiberados liberados = new EmailsLiberados(" Dono@Exemplo.com , outra@exemplo.com ");

        assertThat(liberados.permite("dono@exemplo.com")).isTrue();
        assertThat(liberados.permite("  DONO@EXEMPLO.COM ")).isTrue();
        assertThat(liberados.permite("OUTRA@exemplo.com")).isTrue();
    }

    @Test
    void email_fora_da_lista_nao_e_permitido() {
        EmailsLiberados liberados = new EmailsLiberados("dono@exemplo.com");

        assertThat(liberados.permite("intruso@exemplo.com")).isFalse();
        assertThat(liberados.permite("xdono@exemplo.com")).isFalse();
    }
}
