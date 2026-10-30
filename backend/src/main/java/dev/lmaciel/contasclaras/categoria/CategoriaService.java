package dev.lmaciel.contasclaras.categoria;

import java.text.Collator;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.categoria.dto.CategoriaRequest;
import dev.lmaciel.contasclaras.categoria.dto.CategoriaResponse;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.comum.ViolacaoDeUnicidade;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.item.dto.ItemResponse;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

@Service
public class CategoriaService {

    static final String NOME_DUPLICADO = "Já existe uma categoria com esse nome.";
    static final String COM_LANCAMENTOS = "Categoria tem lançamentos. Arquive os itens em vez de apagar.";
    static final String ORDEM_INCOMPLETA = "A lista deve conter exatamente as suas categorias.";
    static final String TIPO_OBRIGATORIO = "Informe o tipo da categoria.";

    /** Itens em ordem alfabética do português, sem separar maiúsculas de minúsculas nem acentuadas. */
    private static final Comparator<Item> POR_NOME = Comparator.comparing(Item::getNome,
            Collator.getInstance(Locale.forLanguageTag("pt-BR")));

    private final CategoriaRepository categorias;
    private final ItemRepository itens;
    private final UsuarioRepository usuarios;

    public CategoriaService(CategoriaRepository categorias, ItemRepository itens, UsuarioRepository usuarios) {
        this.categorias = categorias;
        this.itens = itens;
        this.usuarios = usuarios;
    }

    /**
     * Único lugar que decide se uma categoria é do usuário. De outro usuário ou inexistente dá o mesmo
     * 404, para não revelar quais ids existem.
     */
    @Transactional(readOnly = true)
    public Categoria buscarDoUsuario(long categoriaId, UsuarioLogado u) {
        return categorias.findByIdAndUsuarioId(categoriaId, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listar(UsuarioLogado u) {
        Map<Long, List<Item>> itensPorCategoria = itens.findDoUsuario(u.id()).stream()
                .sorted(POR_NOME)
                .collect(Collectors.groupingBy(i -> i.getCategoria().getId(), LinkedHashMap::new,
                        Collectors.toList()));
        return categorias.findByUsuarioIdOrderByOrdem(u.id()).stream()
                .map(c -> CategoriaResponse.de(c, respostas(itensPorCategoria.getOrDefault(c.getId(), List.of()))))
                .toList();
    }

    @Transactional
    public CategoriaResponse criar(CategoriaRequest req, UsuarioLogado u) {
        if (req.tipo() == null) {
            throw new RequisicaoInvalidaException(TIPO_OBRIGATORIO);
        }
        if (categorias.existsByUsuarioIdAndNome(u.id(), req.nome())) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        Categoria nova = new Categoria(usuarios.getReferenceById(u.id()), req.nome(), req.tipo(),
                categorias.maiorOrdem(u.id()) + 1);
        // A checagem acima evita o erro no caso comum; a restrição única do banco decide as corridas.
        try {
            categorias.saveAndFlush(nova);
        } catch (DataIntegrityViolationException e) {
            throw duplicada(e);
        }
        return CategoriaResponse.de(nova, List.of());
    }

    @Transactional
    public CategoriaResponse renomear(long categoriaId, CategoriaRequest req, UsuarioLogado u) {
        Categoria categoria = buscarDoUsuario(categoriaId, u);
        // Antes de mexer na entidade: a consulta faria o flush da mudança e estouraria a restrição do banco.
        if (categorias.existsByUsuarioIdAndNomeAndIdNot(u.id(), req.nome(), categoriaId)) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        categoria.renomear(req.nome());
        try {
            categorias.flush();
        } catch (DataIntegrityViolationException e) {
            throw duplicada(e);
        }
        return CategoriaResponse.de(categoria,
                respostas(itens.findByCategoriaId(categoriaId).stream().sorted(POR_NOME).toList()));
    }

    @Transactional
    public void excluir(long categoriaId, UsuarioLogado u) {
        Categoria categoria = buscarDoUsuario(categoriaId, u);
        if (categorias.temLancamentos(categoriaId)) {
            throw new ConflitoException(COM_LANCAMENTOS);
        }
        categorias.delete(categoria);
    }

    /** A lista precisa ter exatamente as categorias do usuário, cada uma uma vez; a posição vira a ordem. */
    @Transactional
    public void reordenar(List<Long> ids, UsuarioLogado u) {
        List<Categoria> doUsuario = categorias.findByUsuarioIdOrderByOrdem(u.id());
        Set<Long> esperados = doUsuario.stream().map(Categoria::getId).collect(Collectors.toSet());
        if (ids.size() != esperados.size() || !esperados.equals(new HashSet<>(ids))) {
            throw new RequisicaoInvalidaException(ORDEM_INCOMPLETA);
        }
        Map<Long, Categoria> porId = doUsuario.stream().collect(Collectors.toMap(Categoria::getId, c -> c));
        for (int posicao = 0; posicao < ids.size(); posicao++) {
            porId.get(ids.get(posicao)).moverPara(posicao);
        }
    }

    private static List<ItemResponse> respostas(List<Item> lista) {
        return lista.stream().map(ItemResponse::de).toList();
    }

    private static RuntimeException duplicada(DataIntegrityViolationException e) {
        return ViolacaoDeUnicidade.ocorreu(e) ? new ConflitoException(NOME_DUPLICADO) : e;
    }
}
