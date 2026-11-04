package dev.lmaciel.aprumo.saldo;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.categoria.TipoCategoria;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;
import dev.lmaciel.aprumo.lancamento.TotalTipo;
import dev.lmaciel.aprumo.lancamento.dto.MesAno;
import dev.lmaciel.aprumo.saldo.dto.SaldoMes;

/**
 * Saldo do Itaú: receitas pagas menos despesas pagas (faturas de cartão pagas incluídas) desde o mês de
 * início configurado até o mês consultado. A sobra de um mês passa para o seguinte; lançamentos previstos
 * não contam.
 */
@Service
public class SaldoService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final LancamentoRepository lancamentos;
    private final MesAno inicio;

    public SaldoService(LancamentoRepository lancamentos, @Value("${app.saldo.inicio}") String inicio) {
        this.lancamentos = lancamentos;
        this.inicio = parseInicio(inicio);
    }

    private static MesAno parseInicio(String inicio) {
        YearMonth ym;
        try {
            ym = YearMonth.parse(inicio);
        } catch (DateTimeParseException e) {
            throw new IllegalStateException("app.saldo.inicio deve ser AAAA-MM, recebido: " + inicio, e);
        }
        if (ym.getYear() < 2000 || ym.getYear() > 2100) {
            throw new IllegalStateException("app.saldo.inicio deve ser AAAA-MM, recebido: " + inicio);
        }
        return new MesAno(ym.getYear(), ym.getMonthValue());
    }

    @Transactional(readOnly = true)
    public SaldoMes saldo(int ano, int mes, UsuarioLogado usuario) {
        int indice = new MesAno(ano, mes).indice();
        if (indice < inicio.indice()) {
            return new SaldoMes(false, ZERO, ZERO);
        }
        List<TotalTipo> acumulado = lancamentos.totaisPagosPorTipo(usuario.id(), inicio.indice(), indice);
        List<TotalTipo> doMes = lancamentos.totaisPagosPorTipo(usuario.id(), indice, indice);
        BigDecimal saldo = total(acumulado, TipoCategoria.RECEITA).subtract(total(acumulado, TipoCategoria.DESPESA));
        return new SaldoMes(true, saldo, total(doMes, TipoCategoria.RECEITA));
    }

    private static BigDecimal total(List<TotalTipo> totais, TipoCategoria tipo) {
        return totais.stream().filter(t -> t.tipo() == tipo).map(TotalTipo::total).findFirst().orElse(ZERO);
    }
}
