package dev.lmaciel.contasclaras.relatorio;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.lancamento.Lancamento;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;
import dev.lmaciel.contasclaras.relatorio.dto.CategoriaAno;
import dev.lmaciel.contasclaras.relatorio.dto.CelulaMes;
import dev.lmaciel.contasclaras.relatorio.dto.ItemAno;
import dev.lmaciel.contasclaras.relatorio.dto.RelatorioAno;

/**
 * Relatório do ano: uma única consulta traz os lançamentos com item e categoria (sem N+1) e o resto é
 * montagem em memória. Só aparecem categorias e itens com lançamento no ano, arquivados inclusive.
 */
@Service
public class RelatorioService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int MESES = 12;

    private final LancamentoRepository lancamentos;

    public RelatorioService(LancamentoRepository lancamentos) {
        this.lancamentos = lancamentos;
    }

    @Transactional(readOnly = true)
    public RelatorioAno ano(int ano, UsuarioLogado u) {
        List<CategoriaAno> categorias = categorias(lancamentos.findDoAno(u.id(), ano));

        BigDecimal[] receitasMes = zeros();
        BigDecimal[] despesasMes = zeros();
        for (CategoriaAno c : categorias) {
            BigDecimal[] destino = c.tipo() == TipoCategoria.RECEITA ? receitasMes : despesasMes;
            for (int i = 0; i < MESES; i++) {
                destino[i] = destino[i].add(c.totaisMes().get(i));
            }
        }

        BigDecimal[] diferencaMes = zeros();
        for (int i = 0; i < MESES; i++) {
            diferencaMes[i] = receitasMes[i].subtract(despesasMes[i]);
        }
        BigDecimal receitasAno = soma(receitasMes);
        BigDecimal despesasAno = soma(despesasMes);

        return new RelatorioAno(ano, categorias, lista(receitasMes), lista(despesasMes), lista(diferencaMes),
                receitasAno, despesasAno, receitasAno.subtract(despesasAno));
    }

    /** Agrupa os lançamentos (já ordenados por categoria, item e mês) e põe as receitas na frente. */
    private static List<CategoriaAno> categorias(List<Lancamento> doAno) {
        Map<Long, Map<Long, Linha>> porCategoria = new LinkedHashMap<>();
        Map<Long, Categoria> categorias = new LinkedHashMap<>();
        for (Lancamento l : doAno) {
            Item item = l.getItem();
            Categoria categoria = item.getCategoria();
            categorias.putIfAbsent(categoria.getId(), categoria);
            Linha linha = porCategoria.computeIfAbsent(categoria.getId(), k -> new LinkedHashMap<>())
                    .computeIfAbsent(item.getId(), k -> new Linha(item));
            linha.celulas[l.getMes() - 1] = new CelulaMes(l.getValor(), l.getStatus());
        }

        return categorias.values().stream()
                // Estável: dentro de cada tipo, fica a ordem da consulta (ordem da categoria).
                .sorted(Comparator.comparing(c -> c.getTipo() == TipoCategoria.RECEITA ? 0 : 1))
                .map(c -> categoria(c, porCategoria.get(c.getId()).values()))
                .toList();
    }

    private static CategoriaAno categoria(Categoria categoria, Iterable<Linha> linhas) {
        BigDecimal[] totaisMes = zeros();
        List<ItemAno> itens = new ArrayList<>();
        for (Linha linha : linhas) {
            BigDecimal total = ZERO;
            for (int i = 0; i < MESES; i++) {
                CelulaMes celula = linha.celulas[i];
                if (celula != null) {
                    totaisMes[i] = totaisMes[i].add(celula.valor());
                    total = total.add(celula.valor());
                }
            }
            itens.add(new ItemAno(linha.item.getId(), linha.item.getNome(), lista(linha.celulas), total));
        }
        return new CategoriaAno(categoria.getId(), categoria.getNome(), categoria.getTipo(), itens,
                lista(totaisMes), soma(totaisMes));
    }

    /** Células de um item, janeiro a dezembro; posição sem lançamento fica {@code null}. */
    private static final class Linha {
        final Item item;
        final CelulaMes[] celulas = new CelulaMes[MESES];

        Linha(Item item) {
            this.item = item;
        }
    }

    private static BigDecimal[] zeros() {
        BigDecimal[] zeros = new BigDecimal[MESES];
        Arrays.fill(zeros, ZERO);
        return zeros;
    }

    private static BigDecimal soma(BigDecimal[] valores) {
        return Arrays.stream(valores).reduce(ZERO, BigDecimal::add);
    }

    /** Lista fixa e somente leitura; aceita {@code null} (o {@code List.of} não aceita). */
    private static <T> List<T> lista(T[] elementos) {
        return Collections.unmodifiableList(Arrays.asList(elementos));
    }
}
