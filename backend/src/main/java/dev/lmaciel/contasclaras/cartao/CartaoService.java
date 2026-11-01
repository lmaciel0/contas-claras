package dev.lmaciel.contasclaras.cartao;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.cartao.dto.CartaoUso;
import dev.lmaciel.contasclaras.cartao.dto.CartoesMes;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.lancamento.FaturaItem;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;

/** Uso do limite dos cartões no mês: duas consultas (cartões ativos e faturas do mês), sem N+1. */
@Service
public class CartaoService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int CASAS_USO = 4;

    private final ItemRepository itens;
    private final LancamentoRepository lancamentos;

    public CartaoService(ItemRepository itens, LancamentoRepository lancamentos) {
        this.itens = itens;
        this.lancamentos = lancamentos;
    }

    @Transactional(readOnly = true)
    public CartoesMes cartoes(int ano, int mes, UsuarioLogado u) {
        Map<Long, BigDecimal> faturas = new HashMap<>();
        for (FaturaItem f : lancamentos.faturasDosCartoesNoMes(u.id(), ano, mes)) {
            faturas.put(f.itemId(), f.valor());
        }

        List<CartaoUso> cartoes = itens.findCartoesAtivos(u.id()).stream()
                .map(item -> cartao(item, faturas.getOrDefault(item.getId(), ZERO)))
                .sorted(Comparator.comparing(CartaoUso::fatura).reversed().thenComparing(CartaoUso::nome))
                .toList();

        BigDecimal totalFaturas = soma(cartoes, c -> true, CartaoUso::fatura);
        BigDecimal limiteTotal = soma(cartoes, c -> c.limite() != null, CartaoUso::limite);
        BigDecimal faturasComLimite = soma(cartoes, c -> c.limite() != null, CartaoUso::fatura);
        BigDecimal usoGeral = limiteTotal.signum() == 0 ? null : uso(faturasComLimite, limiteTotal);

        return new CartoesMes(totalFaturas, limiteTotal, usoGeral, cartoes);
    }

    private static CartaoUso cartao(Item item, BigDecimal fatura) {
        BigDecimal uso = item.getLimite() == null ? null : uso(fatura, item.getLimite());
        return new CartaoUso(item.getId(), item.getNome(), item.getDiaVencimento(), fatura, item.getLimite(),
                uso, FaixaUso.de(uso), item.getTitular());
    }

    private static BigDecimal uso(BigDecimal fatura, BigDecimal limite) {
        return fatura.divide(limite, CASAS_USO, RoundingMode.HALF_UP);
    }

    private static BigDecimal soma(List<CartaoUso> cartoes, Predicate<CartaoUso> filtro,
            Function<CartaoUso, BigDecimal> valor) {
        return cartoes.stream().filter(filtro).map(valor).reduce(ZERO, BigDecimal::add);
    }
}
