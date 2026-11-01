package dev.lmaciel.contasclaras.item;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.CategoriaService;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.comum.ViolacaoDeUnicidade;
import dev.lmaciel.contasclaras.item.dto.ItemRequest;

@Service
public class ItemService {

    static final String NOME_DUPLICADO = "Já existe um item com esse nome.";
    static final String ARQUIVADO_OBRIGATORIO = "Informe se o item está arquivado.";

    private final ItemRepository itens;
    private final CategoriaService categorias;

    public ItemService(ItemRepository itens, CategoriaService categorias) {
        this.itens = itens;
        this.categorias = categorias;
    }

    /**
     * Único lugar que decide se um item é do usuário (via a categoria dele). De outro usuário ou
     * inexistente dá o mesmo 404. Lançamentos e relatórios usam este método.
     */
    @Transactional(readOnly = true)
    public Item buscarDoUsuario(long itemId, UsuarioLogado u) {
        return itens.findByIdDoUsuario(itemId, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    @Transactional
    public Item criar(long categoriaId, ItemRequest req, UsuarioLogado u) {
        Categoria categoria = categorias.buscarDoUsuario(categoriaId, u);
        if (itens.existsByCategoriaIdAndNome(categoriaId, req.nome())) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        Item novo = new Item(categoria, req.nome(), req.diaVencimento(), req.cartao(), req.limite(), req.titular());
        // A checagem acima evita o erro no caso comum; a restrição única do banco decide as corridas.
        try {
            return itens.saveAndFlush(novo);
        } catch (DataIntegrityViolationException e) {
            throw duplicado(e);
        }
    }

    @Transactional
    public Item atualizar(long itemId, ItemRequest req, UsuarioLogado u) {
        Item item = buscarDoUsuario(itemId, u);
        if (req.arquivado() == null) {
            throw new RequisicaoInvalidaException(ARQUIVADO_OBRIGATORIO);
        }
        // Antes de mexer na entidade: a consulta faria o flush da mudança e estouraria a restrição do banco.
        if (itens.existsByCategoriaIdAndNomeAndIdNot(item.getCategoria().getId(), req.nome(), itemId)) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        item.atualizar(req.nome(), req.diaVencimento(), req.cartao(), req.limite(), req.arquivado(), req.titular());
        try {
            itens.flush();
        } catch (DataIntegrityViolationException e) {
            throw duplicado(e);
        }
        return item;
    }

    private static RuntimeException duplicado(DataIntegrityViolationException e) {
        return ViolacaoDeUnicidade.ocorreu(e) ? new ConflitoException(NOME_DUPLICADO) : e;
    }
}
