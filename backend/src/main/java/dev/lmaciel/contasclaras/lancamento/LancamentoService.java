package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;
import java.text.Collator;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.Dinheiro;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.comum.ViolacaoDeUnicidade;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemService;
import dev.lmaciel.contasclaras.lancamento.dto.LancamentoResponse;
import dev.lmaciel.contasclaras.lancamento.dto.MesAno;
import dev.lmaciel.contasclaras.lancamento.dto.SalvarLancamentoRequest;

@Service
public class LancamentoService {

    static final String ITEM_ARQUIVADO = "Item arquivado.";
    static final String PERIODO_INVALIDO = "Período de repetição inválido.";
    static final String SALVO_POR_OUTRA = "Esse mês acabou de ser salvo por outra requisição. Tente de novo.";

    /** Até quantos meses depois do lançamento o "repetir até" pode ir. */
    static final int MAXIMO_MESES_A_FRENTE = 60;

    /** Ordem das categorias e, dentro delas, alfabética do português (sem separar maiúsculas nem acentos). */
    private static final Comparator<Lancamento> POR_CATEGORIA_E_ITEM = Comparator
            .comparingInt((Lancamento l) -> l.getItem().getCategoria().getOrdem())
            .thenComparing(l -> l.getItem().getNome(), Collator.getInstance(Locale.forLanguageTag("pt-BR")));

    private final LancamentoRepository lancamentos;
    private final ItemService itens;

    public LancamentoService(LancamentoRepository lancamentos, ItemService itens) {
        this.lancamentos = lancamentos;
        this.itens = itens;
    }

    @Transactional(readOnly = true)
    public List<LancamentoResponse> listar(int ano, int mes, UsuarioLogado u) {
        return lancamentos.findDoMes(u.id(), ano, mes).stream()
                .sorted(POR_CATEGORIA_E_ITEM)
                .map(LancamentoResponse::de)
                .toList();
    }

    /**
     * Upsert por (item, ano, mês). Devolve o lançamento salvo e, depois dele, os previstos criados por
     * {@code repetirAte}. Tudo ou nada: qualquer recusa desfaz a transação inteira.
     */
    @Transactional
    public List<LancamentoResponse> salvar(SalvarLancamentoRequest req, UsuarioLogado u) {
        Dinheiro.validar(req.valor());
        MesAno mes = new MesAno(req.ano(), req.mes());
        validarPeriodo(mes, req.repetirAte());
        Item item = itens.buscarDoUsuario(req.itemId(), u);

        List<Lancamento> salvos = new ArrayList<>();
        // A busca evita o erro no caso comum; a restrição única do banco decide as corridas.
        try {
            salvos.add(gravar(item, req));
            if (req.repetirAte() != null) {
                salvos.addAll(repetir(item, req.itemId(), mes, req.repetirAte(), req.valor()));
            }
            lancamentos.flush();
        } catch (DataIntegrityViolationException e) {
            throw ViolacaoDeUnicidade.ocorreu(e) ? new ConflitoException(SALVO_POR_OUTRA) : e;
        }
        return salvos.stream().map(LancamentoResponse::de).toList();
    }

    @Transactional
    public LancamentoResponse mudarStatus(long id, StatusLancamento status, UsuarioLogado u) {
        Lancamento lancamento = buscarDoUsuario(id, u);
        lancamento.mudarStatus(status);
        return LancamentoResponse.de(lancamento);
    }

    @Transactional
    public void excluir(long id, UsuarioLogado u) {
        lancamentos.delete(buscarDoUsuario(id, u));
    }

    /** Uma consulta só, ligando lançamento a item, categoria e usuário: de outro usuário dá o mesmo 404. */
    private Lancamento buscarDoUsuario(long id, UsuarioLogado u) {
        return lancamentos.findByIdDoUsuario(id, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    private static void validarPeriodo(MesAno mes, MesAno repetirAte) {
        if (repetirAte != null
                && (repetirAte.compareTo(mes) <= 0
                        || repetirAte.indice() - mes.indice() > MAXIMO_MESES_A_FRENTE)) {
            throw new RequisicaoInvalidaException(PERIODO_INVALIDO);
        }
    }

    private Lancamento gravar(Item item, SalvarLancamentoRequest req) {
        LocalDate vencimento = req.vencimento() != null
                ? req.vencimento()
                : Vencimento.padrao(req.ano(), req.mes(), item.getDiaVencimento());
        Optional<Lancamento> existente = lancamentos.findByItemIdAndAnoAndMes(req.itemId(), req.ano(), req.mes());
        if (existente.isPresent()) {
            // editar o que já existe vale também para item arquivado
            existente.get().atualizar(req.valor(), req.status(), vencimento);
            return existente.get();
        }
        exigirAtivo(item);
        return lancamentos.save(new Lancamento(item, req.ano(), req.mes(), req.valor(), req.status(), vencimento));
    }

    /** Cria PREVISTO nos meses depois de {@code de} até {@code ate} (inclusive) que ainda não têm lançamento. */
    private List<Lancamento> repetir(Item item, long itemId, MesAno de, MesAno ate, BigDecimal valor) {
        Set<Integer> ocupados = lancamentos.findDoItemNoPeriodo(itemId, de.indice() + 1, ate.indice()).stream()
                .map(l -> new MesAno(l.getAno(), l.getMes()).indice())
                .collect(Collectors.toSet());
        List<Lancamento> criados = new ArrayList<>();
        for (MesAno mes = de.proximo(); mes.compareTo(ate) <= 0; mes = mes.proximo()) {
            if (ocupados.contains(mes.indice())) {
                continue;
            }
            exigirAtivo(item);
            criados.add(lancamentos.save(new Lancamento(item, mes.ano(), mes.mes(), valor,
                    StatusLancamento.PREVISTO, Vencimento.padrao(mes.ano(), mes.mes(), item.getDiaVencimento()))));
        }
        return criados;
    }

    private static void exigirAtivo(Item item) {
        if (item.isArquivado()) {
            throw new ConflitoException(ITEM_ARQUIVADO);
        }
    }
}
