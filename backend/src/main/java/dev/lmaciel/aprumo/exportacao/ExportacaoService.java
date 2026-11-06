package dev.lmaciel.aprumo.exportacao;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.categoria.CategoriaRepository;
import dev.lmaciel.aprumo.comum.MuitasTentativasException;
import dev.lmaciel.aprumo.comum.NaoEncontradoException;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.CategoriaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.CategoriaNotaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.ItemExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.LancamentoExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.NotaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.ProjetoExportado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.SubtarefaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.TarefaExportada;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse.UsuarioExportado;
import dev.lmaciel.aprumo.item.Item;
import dev.lmaciel.aprumo.item.ItemRepository;
import dev.lmaciel.aprumo.lancamento.Lancamento;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;
import dev.lmaciel.aprumo.nota.CategoriaNotaRepository;
import dev.lmaciel.aprumo.nota.Nota;
import dev.lmaciel.aprumo.nota.NotaRepository;
import dev.lmaciel.aprumo.projeto.Projeto;
import dev.lmaciel.aprumo.projeto.ProjetoRepository;
import dev.lmaciel.aprumo.projeto.ProjetoSubtarefa;
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

    static final String LIMITE_EXCEDIDO = "Você exportou há pouco. Aguarde 30 segundos e tente de novo.";

    private final UsuarioRepository usuarios;
    private final CategoriaRepository categorias;
    private final ItemRepository itens;
    private final LancamentoRepository lancamentos;
    private final TarefaRepository tarefas;
    private final CategoriaNotaRepository categoriasNota;
    private final NotaRepository notas;
    private final ProjetoRepository projetos;
    private final LimiteExportacao limite;
    private final ObjectMapper json;
    private final Clock clock;

    public ExportacaoService(UsuarioRepository usuarios, CategoriaRepository categorias, ItemRepository itens,
            LancamentoRepository lancamentos, TarefaRepository tarefas,
            CategoriaNotaRepository categoriasNota, NotaRepository notas, ProjetoRepository projetos,
            LimiteExportacao limite, ObjectMapper json, Clock clock) {
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.itens = itens;
        this.lancamentos = lancamentos;
        this.tarefas = tarefas;
        this.categoriasNota = categoriasNota;
        this.notas = notas;
        this.projetos = projetos;
        this.limite = limite;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ExportacaoResponse exportar(UsuarioLogado logado) {
        long id = logado.id();
        if (!limite.reservar(id)) {
            throw new MuitasTentativasException(LIMITE_EXCEDIDO);
        }
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

    private NotaExportada nota(Nota n) {
        Long categoriaId = n.getCategoria() == null ? null : n.getCategoria().getId();
        String categoria = n.getCategoria() == null ? null : n.getCategoria().getNome();
        return new NotaExportada(n.getTitulo(), ConteudoExportado.de(json, n.getConteudo()), n.getTexto(), categoriaId,
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
