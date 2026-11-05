package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import dev.lmaciel.aprumo.auth.dto.ExcluirContaRequest;
import dev.lmaciel.aprumo.categoria.CategoriasPadrao;
import dev.lmaciel.aprumo.comum.NaoAutenticadoException;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;

class AuthServiceExclusaoTest {

    @Test
    void contaApagadaNoMeioDaExclusaoRetorna401SemMexerEmNada() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        LancamentoRepository lancamentos = mock(LancamentoRepository.class);
        CodigoEmailRepository codigos = mock(CodigoEmailRepository.class);
        when(encoder.encode(anyString())).thenReturn("hash-falso");
        when(encoder.matches(anyString(), anyString())).thenReturn(true);
        Usuario usuario = new Usuario("Dono", "dono@exemplo.com", "hash", null);
        when(usuarios.findById(anyLong())).thenReturn(Optional.of(usuario));
        // Outra requisição apagou a conta entre a reautenticação e os deletes.
        when(usuarios.existsById(anyLong())).thenReturn(false);
        AuthService auth = new AuthService(usuarios, encoder, mock(CategoriasPadrao.class),
                new LimiteTentativasLogin(Clock.systemUTC()), mock(GoogleTokenVerifier.class), lancamentos, codigos,
                Clock.fixed(Instant.parse("2026-10-29T15:00:00Z"), ZoneOffset.UTC),
                new TransactionTemplate(mock(PlatformTransactionManager.class)));

        assertThatThrownBy(() -> auth.excluirConta(7L, new ExcluirContaRequest("senha-segura-1", null)))
                .isInstanceOf(NaoAutenticadoException.class);

        verify(lancamentos, never()).apagarDoUsuario(anyLong());
        verify(codigos, never()).apagarPorEmail(anyString());
        verify(usuarios, never()).deleteById(any());
    }
}
