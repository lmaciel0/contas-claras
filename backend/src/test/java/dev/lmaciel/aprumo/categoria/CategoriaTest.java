package dev.lmaciel.aprumo.categoria;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.lmaciel.aprumo.usuario.Usuario;

class CategoriaTest {

    private final Usuario usuario = new Usuario("Lucas", "lucas@exemplo.com", "hash", null);

    @Test
    @DisplayName("deve instanciar categoria com icone e cor customizados")
    void deveInstanciarComIconeECor() {
        Categoria categoria = new Categoria(usuario, "Alimentação", TipoCategoria.DESPESA, 1, "restaurante", "#ef4444");

        assertThat(categoria.getNome()).isEqualTo("Alimentação");
        assertThat(categoria.getTipo()).isEqualTo(TipoCategoria.DESPESA);
        assertThat(categoria.getOrdem()).isEqualTo(1);
        assertThat(categoria.getIcone()).isEqualTo("restaurante");
        assertThat(categoria.getCor()).isEqualTo("#ef4444");
    }

    @Test
    @DisplayName("deve aplicar valores padrao quando icone ou cor forem nulos ou vazios")
    void deveAplicarDefaultsQuandoNulosOuVazios() {
        Categoria categoria = new Categoria(usuario, "Lazer", TipoCategoria.DESPESA, 2, null, "   ");

        assertThat(categoria.getIcone()).isEqualTo("outros");
        assertThat(categoria.getCor()).isEqualTo("#7d7a99");
    }

    @Test
    @DisplayName("construtor legado de 4 argumentos deve atribuir defaults para icone e cor")
    void construtorLegadoDeveAtribuirDefaults() {
        Categoria categoria = new Categoria(usuario, "Salário", TipoCategoria.RECEITA, 1);

        assertThat(categoria.getIcone()).isEqualTo("outros");
        assertThat(categoria.getCor()).isEqualTo("#7d7a99");
    }

    @Test
    @DisplayName("deve atualizar nome, icone e cor limpando espacos")
    void deveAtualizarNomeIconeECor() {
        Categoria categoria = new Categoria(usuario, "Transporte", TipoCategoria.DESPESA, 1, "carro", "#3b82f6");

        categoria.atualizar("Transporte Público", " onibus ", " #2563eb ");

        assertThat(categoria.getNome()).isEqualTo("Transporte Público");
        assertThat(categoria.getIcone()).isEqualTo("onibus");
        assertThat(categoria.getCor()).isEqualTo("#2563eb");
    }

    @Test
    @DisplayName("atualizar com icone ou cor nulos nao deve sobrescrever os existentes")
    void atualizarComNulosNaoSobrescreve() {
        Categoria categoria = new Categoria(usuario, "Saúde", TipoCategoria.DESPESA, 1, "saude", "#84cc16");

        categoria.atualizar("Saúde & Bem-Estar", null, "");

        assertThat(categoria.getNome()).isEqualTo("Saúde & Bem-Estar");
        assertThat(categoria.getIcone()).isEqualTo("saude");
        assertThat(categoria.getCor()).isEqualTo("#84cc16");
    }
}
