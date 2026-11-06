package dev.lmaciel.aprumo.exportacao;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.categoria.CategoriaRepository;
import dev.lmaciel.aprumo.comum.NaoEncontradoException;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.CategoriaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.CategoriaNotaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.ItemExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.LancamentoExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.NotaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.ProjetoExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.SaldoExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.SubtarefaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.TarefaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.UsuarioExportado;
import dev.lmaciel.aprumo.item.Item;
import dev.lmaciel.aprumo.item.ItemRepository;
import dev.lmaciel.aprumo.lancamento.Lancamento;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;
import dev.lmaciel.aprumo.lancamento.dto.MesAno;
import dev.lmaciel.aprumo.nota.CategoriaNotaRepository;
import dev.lmaciel.aprumo.nota.Nota;
import dev.lmaciel.aprumo.nota.NotaRepository;
import dev.lmaciel.aprumo.projeto.Projeto;
import dev.lmaciel.aprumo.projeto.ProjetoRepository;
import dev.lmaciel.aprumo.projeto.ProjetoSubtarefa;
import dev.lmaciel.aprumo.saldo.SaldoService;
import dev.lmaciel.aprumo.saldo.dto.SaldoMes;
import dev.lmaciel.aprumo.tarefa.TarefaRepository;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import tools.jackson.databind.ObjectMapper;

/**
 * Monta a cópia dos dados do usuário logado. Toda consulta filtra pelo id dele e o resultado só leva DTOs
 * próprios: nenhuma entidade é serializada.
 */
@Service
public class ExportacaoService {

    private final UsuarioRepository usuarios;
    private final CategoriaRepository categorias;
    private final ItemRepository itens;
    private final LancamentoRepository lancamentos;
    private final SaldoService saldos;
    private final TarefaRepository tarefas;
    private final CategoriaNotaRepository categoriasNota;
    private final NotaRepository notas;
    private final ProjetoRepository projetos;
    private final ObjectMapper json;
    private final Clock clock;

    public ExportacaoService(UsuarioRepository usuarios, CategoriaRepository categorias, ItemRepository itens,
            LancamentoRepository lancamentos, SaldoService saldos, TarefaRepository tarefas,
            CategoriaNotaRepository categoriasNota, NotaRepository notas, ProjetoRepository projetos,
            ObjectMapper json, Clock clock) {
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.itens = itens;
        this.lancamentos = lancamentos;
        this.saldos = saldos;
        this.tarefas = tarefas;
        this.categoriasNota = categoriasNota;
        this.notas = notas;
        this.projetos = projetos;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ExportacaoResponse exportar(UsuarioLogado logado) {
        long id = logado.id();
        Usuario usuario = usuarios.findById(id).orElseThrow(NaoEncontradoException::new);

        List<Item> todosItens = itens.findDoUsuario(id).stream()
                .sorted(Comparator.comparingInt((Item i) -> i.getCategoria().getOrdem()).thenComparing(Item::getNome))
                .toList();
        List<Lancamento> todosLancamentos = lancamentos.findTodosDoUsuario(id);

        return new ExportacaoResponse(
                Instant.now(clock),
                new UsuarioExportado(usuario.getNome(), usuario.getEmail(), usuario.getCriadoEm()),
                categorias.findByUsuarioIdOrderByOrdem(id).stream()
                        .map(c -> new CategoriaExportada(c.getId(), c.getNome(), c.getTipo(), c.getOrdem(),
                                c.getIcone(), c.getCor()))
                        .toList(),
                todosItens.stream().filter(i -> !i.isCartao()).map(ExportacaoService::item).toList(),
                todosItens.stream().filter(Item::isCartao).map(ExportacaoService::item).toList(),
                todosLancamentos.stream().map(ExportacaoService::lancamento).toList(),
                saldosDosMeses(todosLancamentos, logado),
                tarefas.findByUsuarioIdOrderById(id).stream()
                        .map(t -> new TarefaExportada(t.getTitulo(), t.getData(), t.getConcluidaEm(),
                                t.getCriadoEm()))
                        .toList(),
                categoriasNota.findByUsuarioId(id).stream()
                        .sorted(Comparator.comparing(c -> c.getId()))
                        .map(c -> new CategoriaNotaExportada(c.getId(), c.getNome(), c.getCor()))
                        .toList(),
                notas.findTodasDoUsuario(id).stream().map(this::nota).toList(),
                projetos.findTodosComSubtarefas(id).stream().map(ExportacaoService::projeto).toList());
    }

    private static ItemExportado item(Item i) {
        return new ItemExportado(i.getId(), i.getCategoria().getId(), i.getCategoria().getNome(), i.getNome(),
                i.getDiaVencimento(), i.getLimite(), i.isArquivado(), i.getTitular());
    }

    private static LancamentoExportado lancamento(Lancamento l) {
        return new LancamentoExportado(l.getItem().getId(), l.getItem().getNome(),
                l.getItem().getCategoria().getNome(), l.getAno(), l.getMes(), l.getValor(), l.getStatus(),
                l.getVencimento());
    }

    /** Um saldo por mês que tem lançamento e já está dentro do período em que o saldo é calculado. */
    private List<SaldoExportado> saldosDosMeses(List<Lancamento> doUsuario, UsuarioLogado logado) {
        TreeSet<MesAno> meses = new TreeSet<>();
        doUsuario.forEach(l -> meses.add(new MesAno(l.getAno(), l.getMes())));
        List<SaldoExportado> resultado = new ArrayList<>();
        for (MesAno m : meses) {
            SaldoMes s = saldos.saldo(m.ano(), m.mes(), logado);
            if (s.ativo()) {
                resultado.add(new SaldoExportado(m.ano(), m.mes(), s.saldo(), s.recebidoNoMes()));
            }
        }
        return resultado;
    }

    private NotaExportada nota(Nota n) {
        Long categoriaId = n.getCategoria() == null ? null : n.getCategoria().getId();
        String categoria = n.getCategoria() == null ? null : n.getCategoria().getNome();
        return new NotaExportada(n.getTitulo(), json.readTree(n.getConteudo()), n.getTexto(), categoriaId,
                categoria, n.isFixada(), n.getCriadoEm(), n.getAtualizadoEm());
    }

    private static ProjetoExportado projeto(Projeto p) {
        List<SubtarefaExportada> subtarefas = p.getSubtarefas().stream()
                .sorted(Comparator.comparingInt(ProjetoSubtarefa::getOrdem))
                .map(s -> new SubtarefaExportada(s.getTitulo(), s.isConcluida(), s.getOrdem()))
                .toList();
        return new ProjetoExportado(p.getTitulo(), p.getDescricao(), p.getCategoria(), p.getEstagio(),
                p.getPrioridade(), p.getCor(), p.getOrdem(), p.getPrazo(), subtarefas, p.getCriadoEm(),
                p.getAtualizadoEm());
    }
}
