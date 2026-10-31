package dev.lmaciel.contasclaras.lancamento;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemService;
import dev.lmaciel.contasclaras.lancamento.dto.SalvarLancamentoRequest;

/**
 * Duas requisições simultâneas para o mesmo mês não encontram lançamento e as duas tentam inserir: a segunda
 * quebra na restrição única (item, ano, mês). Aqui a busca "não acha" e o banco recusa, como numa corrida.
 */
class LancamentoServiceCorridaTest {

    private static final UsuarioLogado USUARIO = new UsuarioLogado(1);
    private static final SalvarLancamentoRequest PEDIDO = new SalvarLancamentoRequest(7L, 2026, 11,
            new BigDecimal("10.00"), StatusLancamento.PREVISTO, null, null);

    private final LancamentoRepository lancamentos = mock(LancamentoRepository.class);
    private final ItemService itens = mock(ItemService.class);
    private final LancamentoService service = new LancamentoService(lancamentos, itens);

    private static DataIntegrityViolationException violacao(ConstraintKind tipo) {
        var causa = new ConstraintViolationException("violação", new SQLException("falsa"), tipo,
                "lancamento_item_id_ano_mes_key");
        return new DataIntegrityViolationException("violação", causa);
    }

    private void bancoRecusaCom(ConstraintKind tipo) {
        Item item = mock(Item.class);
        when(item.getDiaVencimento()).thenReturn(null);
        when(itens.buscarDoUsuario(7, USUARIO)).thenReturn(item);
        when(lancamentos.findByItemIdAndAnoAndMes(7, 2026, 11)).thenReturn(Optional.empty());
        when(lancamentos.save(any())).thenAnswer(i -> i.getArgument(0));
        doThrow(violacao(tipo)).when(lancamentos).flush();
    }

    @Test
    void restricao_unica_do_banco_no_upsert_vira_409() {
        bancoRecusaCom(ConstraintKind.UNIQUE);

        assertThatThrownBy(() -> service.salvar(PEDIDO, USUARIO))
                .isInstanceOf(ConflitoException.class)
                .hasMessage("Esse mês acabou de ser salvo por outra requisição. Tente de novo.");
    }

    @Test
    void outra_violacao_de_integridade_nao_vira_409() {
        bancoRecusaCom(ConstraintKind.CHECK);

        assertThatThrownBy(() -> service.salvar(PEDIDO, USUARIO))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
