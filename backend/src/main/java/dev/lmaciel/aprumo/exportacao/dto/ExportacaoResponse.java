package dev.lmaciel.aprumo.exportacao.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import dev.lmaciel.aprumo.categoria.TipoCategoria;
import dev.lmaciel.aprumo.lancamento.StatusLancamento;
import dev.lmaciel.aprumo.projeto.CorProjeto;
import dev.lmaciel.aprumo.projeto.EstagioProjeto;
import dev.lmaciel.aprumo.projeto.PrioridadeProjeto;
import tools.jackson.databind.JsonNode;

/**
 * Cópia dos dados do usuário para ele levar consigo (portabilidade). Só dados dele, sem credenciais, sem
 * códigos de e-mail e sem versão de sessão. Os ids são os da própria conta, só para ligar as listas entre si
 * ({@code itemId}, {@code categoriaId}); {@code itens} guarda os itens comuns e {@code cartoes}, os cartões.
 */
public record ExportacaoResponse(
        Instant geradoEm,
        UsuarioExportado usuario,
        List<CategoriaExportada> categorias,
        List<ItemExportado> itens,
        List<ItemExportado> cartoes,
        List<LancamentoExportado> lancamentos,
        List<TarefaExportada> tarefas,
        List<CategoriaNotaExportada> categoriasNota,
        List<NotaExportada> notas,
        List<ProjetoExportado> projetos) {

    public record UsuarioExportado(String nome, String email, Instant criadoEm) {
    }

    public record CategoriaExportada(long id, String nome, TipoCategoria tipo, int ordem, String icone, String cor) {
    }

    public record ItemExportado(long id, long categoriaId, String categoria, String nome, Integer diaVencimento,
            BigDecimal limite, boolean arquivado, String titular) {
    }

    public record LancamentoExportado(long itemId, String item, String categoria, int ano, int mes, BigDecimal valor,
            StatusLancamento status, LocalDate vencimento) {
    }

    public record TarefaExportada(String titulo, LocalDate data, Instant concluidaEm, Instant criadoEm) {
    }

    public record CategoriaNotaExportada(long id, String nome, String cor) {
    }

    /** {@code conteudo} é o JSON do editor; {@code texto} é a versão em texto simples. */
    public record NotaExportada(String titulo, JsonNode conteudo, String texto, Long categoriaId, String categoria,
            boolean fixada, Instant criadoEm, Instant atualizadoEm) {
    }

    public record ProjetoExportado(String titulo, String descricao, String categoria, EstagioProjeto estagio,
            PrioridadeProjeto prioridade, CorProjeto cor, int ordem, LocalDate prazo,
            List<SubtarefaExportada> subtarefas, Instant criadoEm, Instant atualizadoEm) {
    }

    public record SubtarefaExportada(String titulo, boolean concluida, int ordem) {
    }
}
