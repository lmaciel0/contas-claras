package dev.lmaciel.contasclaras.usuario;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UsuarioTest {

    @Test
    void usuario_novo_comeca_na_versao_de_sessao_zero() {
        Usuario usuario = new Usuario("Dono Teste", "dono@exemplo.com", null, null);

        assertThat(usuario.getSessaoVersao()).isZero();
    }

    @Test
    void invalidar_sessoes_incrementa_a_versao() {
        Usuario usuario = new Usuario("Dono Teste", "dono@exemplo.com", null, null);

        usuario.invalidarSessoes();
        usuario.invalidarSessoes();

        assertThat(usuario.getSessaoVersao()).isEqualTo(2);
    }
}
