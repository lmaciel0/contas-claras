package dev.lmaciel.contasclaras.importacao;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.SortedMap;
import java.util.TreeMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.CategoriaRepository;
import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.CategoriaLida;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.ItemLido;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.lancamento.Lancamento;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;
import dev.lmaciel.contasclaras.lancamento.StatusLancamento;
import dev.lmaciel.contasclaras.lancamento.Vencimento;
import dev.lmaciel.contasclaras.usuario.Usuario;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * Grava o que o parser leu na conta de um usuário, uma vez só: a conta precisa estar sem lançamentos. As
 * categorias que ela já tinha (as padrão do cadastro) são trocadas pelas da planilha. Tudo numa transação:
 * se algo falha, a conta fica como estava.
 */
@Service
public class ImportacaoService {

    static final String MENSAGEM_CONTA_COM_LANCAMENTOS =
            "A conta já tem lançamentos. A importação só roda numa conta vazia.";

    public record ResumoImportacao(SortedMap<Integer, TotaisAno> porAno, int categorias, int itens, int lancamentos) {
    }

    public record TotaisAno(BigDecimal receitas, BigDecimal despesas) {
    }

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final UsuarioRepository usuarios;
    private final CategoriaRepository categorias;
    private final ItemRepository itens;
    private final LancamentoRepository lancamentos;

    public ImportacaoService(UsuarioRepository usuarios, CategoriaRepository categorias, ItemRepository itens,
            LancamentoRepository lancamentos) {
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.itens = itens;
        this.lancamentos = lancamentos;
    }

    @Transactional
    public ResumoImportacao importar(String email, PlanilhaLida planilha) {
        String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);
        Usuario usuario = usuarios.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ImportacaoRecusadaException("Usuário não encontrado: " + emailNormalizado));
        if (lancamentos.existsByItemCategoriaUsuarioId(usuario.getId())) {
            throw new ImportacaoRecusadaException(MENSAGEM_CONTA_COM_LANCAMENTOS);
        }

        categorias.apagarTodasDoUsuario(usuario.getId());

        SortedMap<Integer, BigDecimal> receitas = new TreeMap<>();
        SortedMap<Integer, BigDecimal> despesas = new TreeMap<>();
        int totalItens = 0;
        int totalLancamentos = 0;

        List<Categoria> novas = new ArrayList<>();
        for (CategoriaLida lida : planilha.categorias()) {
            novas.add(new Categoria(usuario, lida.nome(), lida.tipo(), novas.size()));
        }
        categorias.saveAll(novas);

        for (int c = 0; c < novas.size(); c++) {
            Categoria categoria = novas.get(c);
            List<ItemLido> lidos = planilha.categorias().get(c).itens();

            List<Item> novosItens = new ArrayList<>();
            for (ItemLido lido : lidos) {
                novosItens.add(new Item(categoria, lido.nome(), lido.diaVencimento(), lido.cartao(), null));
            }
            itens.saveAll(novosItens);
            totalItens += novosItens.size();

            SortedMap<Integer, BigDecimal> totaisDoTipo =
                    categoria.getTipo() == TipoCategoria.RECEITA ? receitas : despesas;
            List<Lancamento> novosLancamentos = new ArrayList<>();
            for (int i = 0; i < lidos.size(); i++) {
                Item item = novosItens.get(i);
                lidos.get(i).valores().forEach((mesAno, valorLido) -> {
                    novosLancamentos.add(new Lancamento(item, mesAno.ano(), mesAno.mes(), valorLido.valor(),
                            valorLido.pago() ? StatusLancamento.PAGO : StatusLancamento.PREVISTO,
                            Vencimento.padrao(mesAno.ano(), mesAno.mes(), item.getDiaVencimento())));
                    totaisDoTipo.merge(mesAno.ano(), valorLido.valor(), BigDecimal::add);
                });
            }
            lancamentos.saveAll(novosLancamentos);
            totalLancamentos += novosLancamentos.size();
        }

        return new ResumoImportacao(totaisPorAno(receitas, despesas), novas.size(), totalItens, totalLancamentos);
    }

    private static SortedMap<Integer, TotaisAno> totaisPorAno(SortedMap<Integer, BigDecimal> receitas,
            SortedMap<Integer, BigDecimal> despesas) {
        SortedMap<Integer, TotaisAno> porAno = new TreeMap<>();
        List<Integer> anos = new ArrayList<>(receitas.keySet());
        despesas.keySet().stream().filter(ano -> !receitas.containsKey(ano)).forEach(anos::add);
        anos.forEach(ano -> porAno.put(ano,
                new TotaisAno(receitas.getOrDefault(ano, ZERO), despesas.getOrDefault(ano, ZERO))));
        return porAno;
    }
}
