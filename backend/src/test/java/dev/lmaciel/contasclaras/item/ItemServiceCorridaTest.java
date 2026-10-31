package dev.lmaciel.contasclaras.item;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.SQLException;

import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.CategoriaService;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.item.dto.ItemRequest;

/**
 * A checagem prévia de nome não segura duas requisições simultâneas: as duas passam por ela e a segunda
 * quebra na restrição única do banco. Aqui a checagem "passa" e o banco recusa, como numa corrida.
 */
class ItemServiceCorridaTest {

    private static final UsuarioLogado USUARIO = new UsuarioLogado(1);
    private static final ItemRequest PEDIDO = new ItemRequest("Luz", null, false, null, null);

    private final ItemRepository itens = mock(ItemRepository.class);
    private final CategoriaService categorias = mock(CategoriaService.class);
    private final ItemService service = new ItemService(itens, categorias);

    private static DataIntegrityViolationException violacao(ConstraintKind tipo) {
        var causa = new ConstraintViolationException("violação", new SQLException("falsa"), tipo, "item_nome");
        return new DataIntegrityViolationException("violação", causa);
    }

    @Test
    void restricao_unica_do_banco_na_criacao_vira_409() {
        when(categorias.buscarDoUsuario(10, USUARIO)).thenReturn(mock(Categoria.class));
        when(itens.existsByCategoriaIdAndNome(10, "Luz")).thenReturn(false);
        when(itens.saveAndFlush(any())).thenThrow(violacao(ConstraintKind.UNIQUE));

        assertThatThrownBy(() -> service.criar(10, PEDIDO, USUARIO))
                .isInstanceOf(ConflitoException.class)
                .hasMessage("Já existe um item com esse nome.");
    }

    @Test
    void outra_violacao_de_integridade_nao_vira_409() {
        when(categorias.buscarDoUsuario(10, USUARIO)).thenReturn(mock(Categoria.class));
        when(itens.saveAndFlush(any())).thenThrow(violacao(ConstraintKind.CHECK));

        assertThatThrownBy(() -> service.criar(10, PEDIDO, USUARIO))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
