package dev.lmaciel.contasclaras.tarefa;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.tarefa.dto.TarefaRequest;
import dev.lmaciel.contasclaras.tarefa.dto.TarefaResponse;
import dev.lmaciel.contasclaras.tarefa.dto.TarefasResponse;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

@Service
public class TarefaService {

    /** Quantas concluídas a lista devolve; o total vem à parte. */
    private static final int LIMITE_CONCLUIDAS = 50;

    /** Criação crescente; o id cresce com a criação, então serve de desempate estável. */
    private static final Comparator<Tarefa> POR_CRIACAO = Comparator.comparing(Tarefa::getId);

    private static final Comparator<Tarefa> POR_DATA_E_CRIACAO =
            Comparator.comparing(Tarefa::getData).thenComparing(POR_CRIACAO);

    private final TarefaRepository tarefas;
    private final UsuarioRepository usuarios;
    private final Clock clock;

    public TarefaService(TarefaRepository tarefas, UsuarioRepository usuarios, Clock clock) {
        this.tarefas = tarefas;
        this.usuarios = usuarios;
        this.clock = clock;
    }

    /**
     * Único lugar que decide se uma tarefa é do usuário. De outro usuário ou inexistente dá o mesmo
     * 404, para não revelar quais ids existem.
     */
    @Transactional(readOnly = true)
    public Tarefa buscarDoUsuario(long tarefaId, UsuarioLogado u) {
        return tarefas.findByIdAndUsuarioId(tarefaId, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    @Transactional
    public TarefaResponse criar(TarefaRequest req, UsuarioLogado u) {
        Tarefa nova = new Tarefa(usuarios.getReferenceById(u.id()), req.titulo(), req.data());
        tarefas.saveAndFlush(nova);
        return TarefaResponse.de(nova);
    }

    @Transactional
    public TarefaResponse editar(long id, TarefaRequest req, UsuarioLogado u) {
        Tarefa tarefa = buscarDoUsuario(id, u);
        tarefa.editar(req.titulo(), req.data());
        tarefas.saveAndFlush(tarefa);
        return TarefaResponse.de(tarefa);
    }

    @Transactional
    public TarefaResponse concluir(long id, boolean concluida, UsuarioLogado u) {
        Tarefa tarefa = buscarDoUsuario(id, u);
        if (concluida) {
            tarefa.concluir(Instant.now(clock));
        } else {
            tarefa.reabrir();
        }
        tarefas.saveAndFlush(tarefa);
        return TarefaResponse.de(tarefa);
    }

    @Transactional
    public void excluir(long id, UsuarioLogado u) {
        tarefas.delete(buscarDoUsuario(id, u));
    }

    @Transactional(readOnly = true)
    public TarefasResponse listar(UsuarioLogado u) {
        LocalDate hoje = LocalDate.now(clock);
        List<Tarefa> abertas = tarefas.findByUsuarioIdAndConcluidaEmIsNull(u.id());

        List<TarefaResponse> atrasadas = abertas.stream()
                .filter(t -> t.getData() != null && t.getData().isBefore(hoje))
                .sorted(POR_DATA_E_CRIACAO)
                .map(TarefaResponse::de).toList();
        List<TarefaResponse> deHoje = abertas.stream()
                .filter(t -> hoje.equals(t.getData()))
                .sorted(POR_CRIACAO)
                .map(TarefaResponse::de).toList();
        List<TarefaResponse> comDataFutura = abertas.stream()
                .filter(t -> t.getData() != null && t.getData().isAfter(hoje))
                .sorted(POR_DATA_E_CRIACAO)
                .map(TarefaResponse::de).toList();
        List<TarefaResponse> semData = abertas.stream()
                .filter(t -> t.getData() == null)
                .sorted(POR_CRIACAO)
                .map(TarefaResponse::de).toList();
        List<TarefaResponse> proximas = Stream.concat(comDataFutura.stream(), semData.stream())
                .toList();

        Instant inicioDeHoje = hoje.atStartOfDay(clock.getZone()).toInstant();
        Instant inicioDeAmanha = hoje.plusDays(1).atStartOfDay(clock.getZone()).toInstant();
        List<TarefaResponse> concluidasHoje = tarefas
                .findByUsuarioIdAndConcluidaEmGreaterThanEqualAndConcluidaEmLessThanOrderByConcluidaEmDesc(
                        u.id(), inicioDeHoje, inicioDeAmanha)
                .stream().map(TarefaResponse::de).toList();

        List<TarefaResponse> concluidas = tarefas
                .findTop50ByUsuarioIdAndConcluidaEmIsNotNullOrderByConcluidaEmDesc(u.id())
                .stream().map(TarefaResponse::de).toList();

        return new TarefasResponse(hoje, atrasadas, deHoje, proximas, concluidasHoje, concluidas,
                tarefas.countByUsuarioIdAndConcluidaEmIsNotNull(u.id()));
    }
}
