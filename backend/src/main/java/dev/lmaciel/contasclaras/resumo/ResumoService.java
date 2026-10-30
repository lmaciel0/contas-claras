package dev.lmaciel.contasclaras.resumo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.lancamento.Lancamento;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;
import dev.lmaciel.contasclaras.lancamento.StatusLancamento;
import dev.lmaciel.contasclaras.lancamento.TotalCategoria;
import dev.lmaciel.contasclaras.lancamento.TotalMensal;
import dev.lmaciel.contasclaras.resumo.dto.CategoriaTotal;
import dev.lmaciel.contasclaras.resumo.dto.PontoSerie;
import dev.lmaciel.contasclaras.resumo.dto.ProximaConta;
import dev.lmaciel.contasclaras.resumo.dto.ResumoMes;
import dev.lmaciel.contasclaras.resumo.dto.TotaisMes;

/**
 * Dados da tela Início. Tudo sai de consultas agregadas (soma por mês, tipo e status; soma por categoria);
 * só as próximas contas carregam lançamentos, e apenas as que vencem até 30 dias.
 */
@Service
public class ResumoService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int DIAS_A_FRENTE = 30;
    private static final int CASAS_PERCENTUAL = 4;

    private final LancamentoRepository lancamentos;
    private final Clock clock;

    public ResumoService(LancamentoRepository lancamentos, Clock clock) {
        this.lancamentos = lancamentos;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ResumoMes resumo(int ano, int mes, UsuarioLogado u) {
        Map<Integer, Mes> doAno = porMes(lancamentos.totaisDoAno(u.id(), ano));
        Mes atual = doAno.getOrDefault(mes, Mes.VAZIO);

        BigDecimal sobraAno = doAno.values().stream().map(Mes::sobra).reduce(ZERO, BigDecimal::add);

        return new ResumoMes(
                atual.receitas(),
                atual.despesas(),
                atual.sobra(),
                sobraAno,
                anterior(u, ano, mes, doAno),
                categorias(u, ano, mes),
                proximas(u),
                serie(doAno));
    }

    /** Totais do mês anterior, ou {@code null} se ele não tem nenhum lançamento (janeiro olha dezembro do ano anterior). */
    private TotaisMes anterior(UsuarioLogado u, int ano, int mes, Map<Integer, Mes> doAno) {
        Mes anterior = mes == 1
                ? porMes(lancamentos.totaisDoAno(u.id(), ano - 1)).get(12)
                : doAno.get(mes - 1);
        return anterior == null ? null : new TotaisMes(anterior.receitas(), anterior.despesas(), anterior.sobra());
    }

    /** Despesas por categoria, maiores primeiro. Sem despesas no mês, a lista fica vazia (não há divisor). */
    private List<CategoriaTotal> categorias(UsuarioLogado u, int ano, int mes) {
        List<TotalCategoria> totais = lancamentos.totaisPorCategoria(u.id(), TipoCategoria.DESPESA, ano, mes);
        BigDecimal despesas = totais.stream().map(TotalCategoria::total).reduce(ZERO, BigDecimal::add);
        if (despesas.signum() == 0) {
            return List.of();
        }
        return totais.stream()
                .map(t -> new CategoriaTotal(t.categoriaId(), t.nome(), t.total(),
                        t.total().divide(despesas, CASAS_PERCENTUAL, RoundingMode.HALF_UP)))
                .toList();
    }

    /** Despesas previstas já vencidas ou que vencem em até 30 dias, a partir de hoje (não do mês escolhido). */
    private List<ProximaConta> proximas(UsuarioLogado u) {
        LocalDate hoje = LocalDate.now(clock);
        return lancamentos.findComVencimentoAte(u.id(), TipoCategoria.DESPESA, StatusLancamento.PREVISTO,
                hoje.plusDays(DIAS_A_FRENTE)).stream()
                .map(l -> proxima(l, hoje))
                .toList();
    }

    private static ProximaConta proxima(Lancamento l, LocalDate hoje) {
        return new ProximaConta(l.getId(), l.getItem().getNome(), l.getItem().getCategoria().getNome(),
                l.getValor(), l.getVencimento(), l.getVencimento().isBefore(hoje));
    }

    private static List<PontoSerie> serie(Map<Integer, Mes> doAno) {
        return IntStream.rangeClosed(1, 12)
                .mapToObj(m -> {
                    Mes mes = doAno.getOrDefault(m, Mes.VAZIO);
                    return new PontoSerie(m, mes.receitas(), mes.receitasPrevistas(), mes.despesas(),
                            mes.despesasPrevistas());
                })
                .toList();
    }

    private static Map<Integer, Mes> porMes(List<TotalMensal> linhas) {
        Map<Integer, Mes> meses = new HashMap<>();
        for (TotalMensal linha : linhas) {
            meses.put(linha.mes(), meses.getOrDefault(linha.mes(), Mes.VAZIO).somar(linha));
        }
        return meses;
    }

    /** Acumulador de um mês: total e a parte ainda prevista, de cada lado. */
    private record Mes(BigDecimal receitas, BigDecimal receitasPrevistas, BigDecimal despesas,
            BigDecimal despesasPrevistas) {

        static final Mes VAZIO = new Mes(ZERO, ZERO, ZERO, ZERO);

        Mes somar(TotalMensal t) {
            boolean previsto = t.status() == StatusLancamento.PREVISTO;
            BigDecimal prevista = previsto ? t.total() : ZERO;
            if (t.tipo() == TipoCategoria.RECEITA) {
                return new Mes(receitas.add(t.total()), receitasPrevistas.add(prevista), despesas,
                        despesasPrevistas);
            }
            return new Mes(receitas, receitasPrevistas, despesas.add(t.total()),
                    despesasPrevistas.add(prevista));
        }

        BigDecimal sobra() {
            return receitas.subtract(despesas);
        }
    }
}
