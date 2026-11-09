package dev.lmaciel.aprumo.metas;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.comum.NaoEncontradoException;
import dev.lmaciel.aprumo.metas.dto.AporteMetaRequest;
import dev.lmaciel.aprumo.metas.dto.MetaRequest;
import dev.lmaciel.aprumo.metas.dto.MetaResponse;
import dev.lmaciel.aprumo.metas.dto.ResumoConselheiroResponse;
import dev.lmaciel.aprumo.resumo.ResumoService;
import dev.lmaciel.aprumo.resumo.dto.ResumoMes;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MetaService - Regras de Negócio e Cálculos")
class MetaServiceTest {

    @Mock
    private MetaRepository metaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ResumoService resumoService;

    private Clock clock;
    private MetaService metaService;

    private final UsuarioLogado usuarioLogado = new UsuarioLogado(1L);
    private final Usuario usuario = new Usuario("Lucas", "lucas@teste.com", "hash", null);

    @BeforeEach
    void setup() {
        // Fixa a data em 15 de novembro de 2026
        clock = Clock.fixed(Instant.parse("2026-11-15T12:00:00Z"), ZoneId.of("America/Sao_Paulo"));
        metaService = new MetaService(metaRepository, usuarioRepository, resumoService, clock);
    }

    @Test
    @DisplayName("Cria meta com valores iniciais e calcula ordem")
    void criaMeta() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(metaRepository.save(any(Meta.class))).thenAnswer(inv -> inv.getArgument(0));

        MetaRequest req = new MetaRequest(
                "IPVA 2027",
                new BigDecimal("3000.00"),
                new BigDecimal("600.00"),
                1,
                2027,
                "carro",
                null,
                null,
                0
        );

        MetaResponse res = metaService.criar(req, usuarioLogado);

        assertThat(res.nome()).isEqualTo("IPVA 2027");
        assertThat(res.valorAlvo()).isEqualTo("3000.00");
        assertThat(res.valorGuardado()).isEqualTo("600.00");
        assertThat(res.valorRestante()).isEqualTo("2400.00");
        assertThat(res.percentualConcluido()).isEqualTo("0.2000");
        assertThat(res.mesesRestantes()).isEqualTo(2); // Nov/26 para Jan/27 = 2 meses
        assertThat(res.valorMensalSugerido()).isEqualTo("1200.00"); // 2400 / 2
        assertThat(res.concluida()).isFalse();
    }

    @Test
    @DisplayName("Aporte incrementa saldo guardado")
    void guardaValor() {
        Meta meta = new Meta(usuario, "Reserva", new BigDecimal("5000.00"), new BigDecimal("1000.00"), null, null, "reserva", null, null, 0);
        when(metaRepository.findByIdAndUsuarioId(10L, 1L)).thenReturn(Optional.of(meta));

        MetaResponse res = metaService.guardar(10L, new AporteMetaRequest(new BigDecimal("500.00")), usuarioLogado);

        assertThat(res.valorGuardado()).isEqualTo("1500.00");
        assertThat(meta.getValorGuardado()).isEqualByComparingTo("1500.00");
    }

    @Test
    @DisplayName("Resgate decrementa saldo guardado e rejeita resgate maior que saldo")
    void resgataValor() {
        Meta meta = new Meta(usuario, "Viagem", new BigDecimal("5000.00"), new BigDecimal("1000.00"), 12, 2026, "viagem", null, null, 0);
        when(metaRepository.findByIdAndUsuarioId(10L, 1L)).thenReturn(Optional.of(meta));

        MetaResponse res = metaService.resgatar(10L, new AporteMetaRequest(new BigDecimal("400.00")), usuarioLogado);
        assertThat(res.valorGuardado()).isEqualTo("600.00");

        assertThatThrownBy(() -> metaService.resgatar(10L, new AporteMetaRequest(new BigDecimal("700.00")), usuarioLogado))
                .isInstanceOf(dev.lmaciel.aprumo.comum.RequisicaoInvalidaException.class)
                .hasMessageContaining("excede o saldo guardado");
    }

    @Test
    @DisplayName("Bloqueia acesso a meta de outro usuário lançando NaoEncontradoException")
    void bloqueiaAcessoAlheio() {
        when(metaRepository.findByIdAndUsuarioId(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> metaService.obterPorId(99L, usuarioLogado))
                .isInstanceOf(NaoEncontradoException.class);
    }

    @Test
    @DisplayName("Conselheiro calcula sugestão de aportes com base na sobra prevista")
    void calculaConselheiroComSobra() {
        Meta m1 = new Meta(usuario, "IPVA 2027", new BigDecimal("3000.00"), new BigDecimal("600.00"), 1, 2027, "carro", null, null, 0);
        when(metaRepository.findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(1L)).thenReturn(List.of(m1));

        ResumoMes resumoMes = mock(ResumoMes.class);
        when(resumoMes.sobra()).thenReturn(new BigDecimal("600.00"));
        when(resumoService.resumo(2026, 11, usuarioLogado)).thenReturn(resumoMes);

        ResumoConselheiroResponse conselheiro = metaService.obterConselheiro(2026, 11, usuarioLogado);

        assertThat(conselheiro.sobraMes()).isEqualTo("600.00");
        assertThat(conselheiro.totalMetas()).isEqualTo(1);
        assertThat(conselheiro.sugestoes()).hasSize(1);
        assertThat(conselheiro.sugestoes().get(0).nome()).isEqualTo("IPVA 2027");
        assertThat(conselheiro.sugestaoTexto()).contains("Sua sobra prevista em 11/2026 é de R$ 600,00");
    }
}
