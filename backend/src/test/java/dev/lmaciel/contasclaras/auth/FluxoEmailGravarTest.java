package dev.lmaciel.contasclaras.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * A troca de uma linha que já existe precisa ler com {@code for update}: se {@code confirmar} apagar a linha no
 * intervalo, o update otimista sem lock estouraria em {@code 500} em vez de o pedido responder {@code 202}.
 */
class FluxoEmailGravarTest {

    private static final String EMAIL = "ana@exemplo.com";

    @Test
    @SuppressWarnings("unchecked")
    void esqueci_senha_le_a_linha_existente_com_lock() {
        CodigoEmailRepository codigoRepo = mock(CodigoEmailRepository.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        CodigosEmail codigos = mock(CodigosEmail.class);
        LimiteEnvio limite = mock(LimiteEnvio.class);
        ModelosEmail modelos = mock(ModelosEmail.class);
        TransactionTemplate tx = mock(TransactionTemplate.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-31T12:00:00Z"), ZoneOffset.UTC);
        when(tx.execute(any())).thenAnswer(i -> ((TransactionCallback<Object>) i.getArgument(0)).doInTransaction(null));
        when(limite.reservar(EMAIL, "203.0.113.7")).thenReturn(Optional.of(1L));
        when(usuarios.existsByEmail(EMAIL)).thenReturn(true);
        when(codigos.gerarCodigo()).thenReturn("123456");
        when(codigos.hmacCodigo(TipoCodigo.SENHA, EMAIL, "123456")).thenReturn("hmac");
        CodigoEmail existente = new CodigoEmail(TipoCodigo.SENHA, EMAIL, null, null, "antigo", null,
                clock.instant(), clock.instant().plusSeconds(900));
        when(codigoRepo.buscarParaConferir(TipoCodigo.SENHA, EMAIL)).thenReturn(Optional.of(existente));
        FluxoEmailService fluxo = new FluxoEmailService(codigoRepo, usuarios, codigos, limite, mock(AuthService.class),
                modelos, mock(EnvioEmail.class), tx, clock);

        fluxo.esqueciSenha(EMAIL, "203.0.113.7");

        verify(codigoRepo).buscarParaConferir(TipoCodigo.SENHA, EMAIL);
        verify(codigoRepo, never()).findByTipoAndEmail(any(), any());
    }
}
