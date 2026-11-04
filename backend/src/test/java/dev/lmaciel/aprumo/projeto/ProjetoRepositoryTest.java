package dev.lmaciel.aprumo.projeto;

import dev.lmaciel.aprumo.IntegracaoTest;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ProjetoRepository - Isolamento e Consultas")
class ProjetoRepositoryTest extends IntegracaoTest {

    @Autowired
    private ProjetoRepository projetoRepository;

    @Autowired
    private ProjetoSubtarefaRepository subtarefaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario usuarioA;
    private Usuario usuarioB;

    @BeforeEach
    void setup() {
        subtarefaRepository.deleteAll();
        projetoRepository.deleteAll();
        usuarioRepository.deleteAll();

        usuarioA = usuarioRepository.save(new Usuario("Lucas A", "lucas.a@teste.com", "hash", null));
        usuarioB = usuarioRepository.save(new Usuario("Lucas B", "lucas.b@teste.com", "hash", null));
    }

    @Test
    @DisplayName("Lista apenas projetos do usuário especificado ordenados por estágio e ordem")
    void listaApenasDoUsuario() {
        Projeto p1 = new Projeto(usuarioA, "Projeto 1", "Desc", "Dev", EstagioProjeto.A_FAZER, PrioridadeProjeto.ALTA, CorProjeto.azul, 0, LocalDate.now());
        Projeto p2 = new Projeto(usuarioA, "Projeto 2", "Desc", "Dev", EstagioProjeto.A_FAZER, PrioridadeProjeto.MEDIA, CorProjeto.esmeralda, 1, LocalDate.now());
        Projeto pAlheio = new Projeto(usuarioB, "Projeto Alheio", "Desc", "Dev", EstagioProjeto.A_FAZER, PrioridadeProjeto.URGENTE, CorProjeto.rosa, 0, LocalDate.now());

        projetoRepository.saveAll(List.of(p1, p2, pAlheio));

        List<Projeto> projetosA = projetoRepository.findByUsuarioIdOrderByEstagioAscOrdemAscCriadoEmDesc(usuarioA.getId());
        assertThat(projetosA).hasSize(2);
        assertThat(projetosA.get(0).getTitulo()).isEqualTo("Projeto 1");
        assertThat(projetosA.get(1).getTitulo()).isEqualTo("Projeto 2");

        List<Projeto> projetosB = projetoRepository.findByUsuarioIdOrderByEstagioAscOrdemAscCriadoEmDesc(usuarioB.getId());
        assertThat(projetosB).hasSize(1);
        assertThat(projetosB.get(0).getTitulo()).isEqualTo("Projeto Alheio");
    }

    @Test
    @DisplayName("findByIdAndUsuarioId retorna vazio se o projeto for de outro usuário")
    void isolamentoPorIdEUsuario() {
        Projeto pAlheio = projetoRepository.save(new Projeto(usuarioB, "Alheio", null, null, EstagioProjeto.EM_ANDAMENTO, PrioridadeProjeto.BAIXA, CorProjeto.indigo, 0, null));

        Optional<Projeto> encontradoPeloA = projetoRepository.findByIdAndUsuarioId(pAlheio.getId(), usuarioA.getId());
        assertThat(encontradoPeloA).isEmpty();

        Optional<Projeto> encontradoPeloB = projetoRepository.findByIdAndUsuarioId(pAlheio.getId(), usuarioB.getId());
        assertThat(encontradoPeloB).isPresent();
    }

    @Test
    @DisplayName("Conta projetos por usuário e estágio para determinar a próxima ordem")
    void contaProjetosPorEstagio() {
        projetoRepository.save(new Projeto(usuarioA, "P1", null, null, EstagioProjeto.A_FAZER, PrioridadeProjeto.MEDIA, CorProjeto.azul, 0, null));
        projetoRepository.save(new Projeto(usuarioA, "P2", null, null, EstagioProjeto.A_FAZER, PrioridadeProjeto.MEDIA, CorProjeto.azul, 1, null));
        projetoRepository.save(new Projeto(usuarioA, "P3", null, null, EstagioProjeto.CONCLUIDO, PrioridadeProjeto.MEDIA, CorProjeto.azul, 0, null));

        long totalAFazer = projetoRepository.countByUsuarioIdAndEstagio(usuarioA.getId(), EstagioProjeto.A_FAZER);
        long totalConcluido = projetoRepository.countByUsuarioIdAndEstagio(usuarioA.getId(), EstagioProjeto.CONCLUIDO);
        long totalEmRevisao = projetoRepository.countByUsuarioIdAndEstagio(usuarioA.getId(), EstagioProjeto.EM_REVISAO);

        assertThat(totalAFazer).isEqualTo(2);
        assertThat(totalConcluido).isEqualTo(1);
        assertThat(totalEmRevisao).isEqualTo(0);
    }
}
