package dev.lmaciel.contasclaras.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.jdbc.autoconfigure.JdbcConnectionDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

import dev.lmaciel.contasclaras.auth.AuthService;
import dev.lmaciel.contasclaras.categoria.CategoriaRepository;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/** O seed recusa banco remoto antes de tocar em qualquer coisa. Sem Spring: só o seed e dublês. */
class DemoSeederGuardaTest {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final AuthService auth = mock(AuthService.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final CategoriaRepository categorias = mock(CategoriaRepository.class);
    private final ItemRepository itens = mock(ItemRepository.class);
    private final LancamentoRepository lancamentos = mock(LancamentoRepository.class);
    private final PlatformTransactionManager transacoes = mock(PlatformTransactionManager.class);

    @BeforeEach
    void contaDemoJaExiste() {
        // Se o guarda deixar passar, o seed só consulta e para: nada é criado nem aqui.
        when(usuarios.existsByEmail(DemoSeeder.EMAIL)).thenReturn(true);
    }

    private DemoSeeder seed(String urlJdbc, boolean permitir) {
        JdbcConnectionDetails banco = mock(JdbcConnectionDetails.class);
        when(banco.getJdbcUrl()).thenReturn(urlJdbc);
        return new DemoSeeder(usuarios, auth, encoder, categorias, itens, lancamentos, Clock.systemUTC(),
                transacoes, banco, permitir);
    }

    @Test
    void banco_remoto_sem_autorizacao_recusa_e_nao_cria_nada() {
        DemoSeeder seeder = seed("jdbc:postgresql://db.exemplo.com:5432/x", false);

        assertThatThrownBy(seeder::semear)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.demo.permitir=true");
        assertThatThrownBy(() -> seeder.run(null)).isInstanceOf(IllegalStateException.class);

        verifyNoInteractions(usuarios, auth, encoder, categorias, itens, lancamentos, transacoes);
    }

    @Test
    void banco_remoto_com_autorizacao_explicita_segue_para_o_seed() {
        boolean criou = seed("jdbc:postgresql://db.exemplo.com:5432/x", true).semear();

        assertThat(criou).isFalse();
        verify(usuarios).existsByEmail(DemoSeeder.EMAIL);
    }

    @Test
    void banco_local_segue_para_o_seed_sem_autorizacao() {
        boolean criou = seed("jdbc:postgresql://localhost:5432/contasclaras", false).semear();

        assertThat(criou).isFalse();
        verify(usuarios).existsByEmail(DemoSeeder.EMAIL);
    }
}
