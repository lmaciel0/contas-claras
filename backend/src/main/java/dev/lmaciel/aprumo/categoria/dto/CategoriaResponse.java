package dev.lmaciel.aprumo.categoria.dto;

import java.util.List;

import dev.lmaciel.aprumo.categoria.Categoria;
import dev.lmaciel.aprumo.categoria.TipoCategoria;
import dev.lmaciel.aprumo.item.dto.ItemResponse;

public record CategoriaResponse(
        long id,
        String nome,
        TipoCategoria tipo,
        int ordem,
        String icone,
        String cor,
        List<ItemResponse> itens) {

    public static CategoriaResponse de(Categoria categoria, List<ItemResponse> itens) {
        return new CategoriaResponse(categoria.getId(), categoria.getNome(), categoria.getTipo(),
                categoria.getOrdem(), categoria.getIcone(), categoria.getCor(), itens);
    }
}
