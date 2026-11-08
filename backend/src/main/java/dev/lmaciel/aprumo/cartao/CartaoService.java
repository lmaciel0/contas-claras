package dev.lmaciel.aprumo.cartao;

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

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.cartao.dto.CartaoUso;
import dev.lmaciel.aprumo.cartao.dto.CartoesMes;
import dev.lmaciel.aprumo.item.Item;
import dev.lmaciel.aprumo.item.ItemRepository;
import dev.lmaciel.aprumo.lancamento.ComprometimentoCartao;
import dev.lmaciel.aprumo.lancamento.FaturaItem;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;

/** Uso do limite dos cartões: faturas do mês e limites comprometidos em três consultas sem N+1. */
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
        Map<Long, FaturaItem> faturas = new HashMap<>();
        for (FaturaItem f : lancamentos.faturasDosCartoesNoMes(u.id(), ano, mes)) {
            faturas.put(f.itemId(), f);
        }

        Map<Long, BigDecimal> comprometidos = new HashMap<>();
        for (ComprometimentoCartao c : lancamentos.limitesComprometidosDosCartoes(u.id())) {
            comprometidos.put(c.itemId(), c.comprometido());
        }

        List<CartaoUso> cartoes = itens.findCartoesAtivos(u.id()).stream()
                .map(item -> cartao(
                        item,
                        faturas.get(item.getId()),
                        comprometidos.getOrDefault(item.getId(), ZERO)))
                .sorted(Comparator.comparing(CartaoUso::fatura).reversed().thenComparing(CartaoUso::nome))
                .toList();

        BigDecimal totalFaturas = soma(cartoes, c -> true, CartaoUso::fatura);
        BigDecimal limiteTotal = soma(cartoes, c -> c.limite() != null, CartaoUso::limite);
        BigDecimal comprometidoComLimite = soma(cartoes, c -> c.limite() != null, CartaoUso::limiteUsado);
        BigDecimal usoGeral = limiteTotal.signum() == 0 ? null : uso(comprometidoComLimite, limiteTotal);

        return new CartoesMes(totalFaturas, limiteTotal, usoGeral, cartoes);
    }

    private static CartaoUso cartao(Item item, FaturaItem faturaItem, BigDecimal comprometido) {
        BigDecimal fatura = faturaItem != null ? faturaItem.valor() : ZERO;
        boolean faturaPaga = faturaItem != null && faturaItem.pago();

        BigDecimal limite = item.getLimite();
        BigDecimal limiteUsado = comprometido;
        BigDecimal limiteDisponivel = limite == null ? null : limite.subtract(comprometido).max(ZERO);
        BigDecimal uso = limite == null ? null : uso(comprometido, limite);

        return new CartaoUso(
                item.getId(),
                item.getNome(),
                item.getDiaVencimento(),
                fatura,
                limite,
                uso,
                FaixaUso.de(uso),
                item.getTitular(),
                item.getCategoria().getId(),
                limiteDisponivel,
                limiteUsado,
                faturaPaga);
    }

    private static BigDecimal uso(BigDecimal valor, BigDecimal limite) {
        return valor.divide(limite, CASAS_USO, RoundingMode.HALF_UP);
    }

    private static BigDecimal soma(List<CartaoUso> cartoes, Predicate<CartaoUso> filtro,
            Function<CartaoUso, BigDecimal> valor) {
        return cartoes.stream().filter(filtro).map(valor).reduce(ZERO, BigDecimal::add);
    }
}
