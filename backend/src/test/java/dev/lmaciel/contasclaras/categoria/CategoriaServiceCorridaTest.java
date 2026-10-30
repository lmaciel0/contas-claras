package dev.lmaciel.contasclaras.categoria;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.dto.CategoriaRequest;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.usuario.Usuario;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * Duas requisições simultâneas passam pela checagem prévia de nome; a segunda quebra na restrição única do
 * banco. Aqui a checagem "passa" e o banco recusa, como numa corrida.
 */
class CategoriaServiceCorridaTest {

    private static final UsuarioLogado USUARIO = new UsuarioLogado(1);
    private static final String MENSAGEM = "Já existe uma categoria com esse nome.";

    private final CategoriaRepository categorias = mock(CategoriaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final CategoriaService service = new CategoriaService(categorias, mock(ItemRepository.class), usuarios);

    private static DataIntegrityViolationException violacao(ConstraintKind tipo) {
        var causa = new ConstraintViolationException("violação", new SQLException("falsa"), tipo, "categoria_nome");
        return new DataIntegrityViolationException("violação", causa);
    }

    @Test
    void restricao_unica_do_banco_na_criacao_vira_409() {
        when(usuarios.getReferenceById(1L)).thenReturn(mock(Usuario.class));
        when(categorias.saveAndFlush(any())).thenThrow(violacao(ConstraintKind.UNIQUE));

        assertThatThrownBy(() -> service.criar(new CategoriaRequest("Viagens", TipoCategoria.DESPESA), USUARIO))
                .isInstanceOf(ConflitoException.class)
                .hasMessage(MENSAGEM);
    }

    @Test
    void restricao_unica_do_banco_ao_renomear_vira_409() {
        Categoria existente = new Categoria(mock(Usuario.class), "Pessoais", TipoCategoria.DESPESA, 1);
        when(categorias.findByIdAndUsuarioId(5, 1)).thenReturn(Optional.of(existente));
        doThrow(violacao(ConstraintKind.UNIQUE)).when(categorias).flush();

        assertThatThrownBy(() -> service.renomear(5, new CategoriaRequest("Viagens", null), USUARIO))
                .isInstanceOf(ConflitoException.class)
                .hasMessage(MENSAGEM);
    }
}
