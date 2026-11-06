package dev.lmaciel.aprumo.nota;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.CannotSerializeTransactionException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.PessimisticLockingFailureException;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.comum.ConflitoException;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import tools.jackson.databind.ObjectMapper;

class NotaServiceFixarTest {

    private static final UsuarioLogado USUARIO = new UsuarioLogado(1L);

    private final NotaRepository notas = mock(NotaRepository.class);
    private final NotaService service = new NotaService(notas, mock(UsuarioRepository.class),
            mock(CategoriaNotaService.class), new ObjectMapper(), Clock.systemUTC());

    private void notaExiste() {
        when(notas.findByIdAndUsuarioId(10L, 1L)).thenReturn(Optional.of(mock(Nota.class)));
    }

    @Test
    void fixarComLockNaDesfixacaoResponde409() {
        notaExiste();
        when(notas.desfixarOutras(anyLong(), anyLong())).thenThrow(new CannotAcquireLockException("lock"));

        assertThatThrownBy(() -> service.fixar(10L, true, USUARIO))
                .isInstanceOf(ConflitoException.class)
                .hasMessage(NotaService.FIXACAO_CONCORRENTE);
    }

    @Test
    void fixarComDeadlockResponde409() {
        notaExiste();
        when(notas.desfixarOutras(anyLong(), anyLong())).thenThrow(new DeadlockLoserDataAccessException("deadlock", null));

        assertThatThrownBy(() -> service.fixar(10L, true, USUARIO)).isInstanceOf(ConflitoException.class);
    }

    @Test
    void fixarComFalhaDeSerializacaoNoFlushResponde409() {
        notaExiste();
        doThrow(new CannotSerializeTransactionException("serializacao")).when(notas).flush();

        assertThatThrownBy(() -> service.fixar(10L, true, USUARIO)).isInstanceOf(ConflitoException.class);
    }

    @Test
    void desafixarComBloqueioPessimistaGenericoResponde409() {
        notaExiste();
        doThrow(new PessimisticLockingFailureException("bloqueio")).when(notas).flush();

        assertThatThrownBy(() -> service.fixar(10L, false, USUARIO)).isInstanceOf(ConflitoException.class);
    }
}
