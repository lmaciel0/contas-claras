package dev.lmaciel.aprumo.metas;

import dev.lmaciel.aprumo.IntegracaoTest;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MetaRepository - Isolamento e Consultas")
class MetaRepositoryTest extends IntegracaoTest {

    @Autowired
    private MetaRepository metaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario usuarioA;
    private Usuario usuarioB;

    @BeforeEach
    void setup() {
        metaRepository.deleteAll();
        usuarioRepository.deleteAll();

        usuarioA = usuarioRepository.save(new Usuario("Lucas A", "lucas.a@teste.com", "hash", null));
        usuarioB = usuarioRepository.save(new Usuario("Lucas B", "lucas.b@teste.com", "hash", null));
    }

    @Test
    @DisplayName("Lista apenas metas do usuário especificado ordenadas por prazo e ordem")
    void listaApenasDoUsuario() {
        Meta m1 = new Meta(usuarioA, "IPVA 2027", new BigDecimal("3000.00"), new BigDecimal("500.00"), 1, 2027, "carro", null, null, 0);
        Meta m2 = new Meta(usuarioA, "Reserva", new BigDecimal("10000.00"), new BigDecimal("2000.00"), null, null, "reserva", null, null, 1);
        Meta mAlheia = new Meta(usuarioB, "Meta Alheia", new BigDecimal("5000.00"), BigDecimal.ZERO, 12, 2026, "viagem", null, null, 0);

        metaRepository.saveAll(List.of(m1, m2, mAlheia));

        List<Meta> metasA = metaRepository.findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(usuarioA.getId());
        assertThat(metasA).hasSize(2);
        assertThat(metasA.get(0).getNome()).isEqualTo("IPVA 2027");
        assertThat(metasA.get(1).getNome()).isEqualTo("Reserva");

        List<Meta> metasB = metaRepository.findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(usuarioB.getId());
        assertThat(metasB).hasSize(1);
        assertThat(metasB.get(0).getNome()).isEqualTo("Meta Alheia");
    }
}
