package dev.lmaciel.contasclaras.nota;

import java.text.Collator;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.comum.ViolacaoDeUnicidade;
import dev.lmaciel.contasclaras.nota.dto.CategoriaNotaRequest;
import dev.lmaciel.contasclaras.nota.dto.CategoriaNotaResponse;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

@Service
public class CategoriaNotaService {

    static final String NOME_DUPLICADO = "Já existe uma categoria de nota com esse nome.";
    static final String COR_INVALIDA = "Cor inválida. Escolha uma cor da paleta.";

    /** Ordem alfabética do português, sem separar maiúsculas de minúsculas (acento ainda desempata). */
    private static final Collator COLLATOR = collator();

    private static final Comparator<CategoriaNota> POR_NOME =
            Comparator.comparing(CategoriaNota::getNome, COLLATOR).thenComparing(CategoriaNota::getId);

    private final CategoriaNotaRepository categorias;
    private final UsuarioRepository usuarios;
    private final NotaRepository notas;

    public CategoriaNotaService(CategoriaNotaRepository categorias, UsuarioRepository usuarios, NotaRepository notas) {
        this.categorias = categorias;
        this.usuarios = usuarios;
        this.notas = notas;
    }

    /**
     * Único lugar que decide se uma categoria de nota é do usuário. De outro usuário ou inexistente dá o
     * mesmo 404, para não revelar quais ids existem.
     */
    @Transactional(readOnly = true)
    public CategoriaNota buscarDoUsuario(long categoriaId, UsuarioLogado u) {
        return categorias.findByIdAndUsuarioId(categoriaId, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    @Transactional(readOnly = true)
    public List<CategoriaNotaResponse> listar(UsuarioLogado u) {
        Map<Long, Long> totais = totaisPorCategoria(u.id());
        return categorias.findByUsuarioId(u.id()).stream()
                .sorted(POR_NOME)
                .map(c -> CategoriaNotaResponse.de(c, totais.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CategoriaNotaResponse criar(CategoriaNotaRequest req, UsuarioLogado u) {
        CorCategoriaNota cor = cor(req);
        if (categorias.existeNome(u.id(), req.nome())) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        CategoriaNota nova = new CategoriaNota(usuarios.getReferenceById(u.id()), req.nome(), cor);
        // A checagem acima evita o erro no caso comum; o índice único do banco decide as corridas.
        try {
            categorias.saveAndFlush(nova);
        } catch (DataIntegrityViolationException e) {
            throw duplicada(e);
        }
        return CategoriaNotaResponse.de(nova, 0);
    }

    @Transactional
    public CategoriaNotaResponse editar(long categoriaId, CategoriaNotaRequest req, UsuarioLogado u) {
        CategoriaNota categoria = buscarDoUsuario(categoriaId, u);
        CorCategoriaNota cor = cor(req);
        // Antes de mexer na entidade: a consulta faria o flush da mudança e estouraria o índice do banco.
        if (categorias.existeNomeEmOutra(u.id(), req.nome(), categoriaId)) {
            throw new ConflitoException(NOME_DUPLICADO);
        }
        categoria.editar(req.nome(), cor);
        try {
            categorias.flush();
        } catch (DataIntegrityViolationException e) {
            throw duplicada(e);
        }
        return CategoriaNotaResponse.de(categoria, totaisPorCategoria(u.id()).getOrDefault(categoriaId, 0L));
    }

    /** As notas da categoria ficam sem categoria: o {@code on delete set null} do banco cuida disso. */
    @Transactional
    public void excluir(long categoriaId, UsuarioLogado u) {
        CategoriaNota categoria = buscarDoUsuario(categoriaId, u);
        categorias.delete(categoria);
        categorias.flush();
    }

    private Map<Long, Long> totaisPorCategoria(long usuarioId) {
        Map<Long, Long> totais = new HashMap<>();
        notas.totaisPorCategoria(usuarioId).forEach(t -> totais.put(t.categoriaId(), t.total()));
        return totais;
    }

    private static CorCategoriaNota cor(CategoriaNotaRequest req) {
        return CorCategoriaNota.da(req.cor()).orElseThrow(() -> new RequisicaoInvalidaException(COR_INVALIDA));
    }

    private static RuntimeException duplicada(DataIntegrityViolationException e) {
        return ViolacaoDeUnicidade.ocorreu(e) ? new ConflitoException(NOME_DUPLICADO) : e;
    }

    private static Collator collator() {
        Collator c = Collator.getInstance(Locale.forLanguageTag("pt-BR"));
        c.setStrength(Collator.SECONDARY);
        return c;
    }
}
