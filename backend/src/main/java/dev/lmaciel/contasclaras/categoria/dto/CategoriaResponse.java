package dev.lmaciel.contasclaras.categoria.dto;

import java.util.List;

import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.item.dto.ItemResponse;

public record CategoriaResponse(
        long id,
        String nome,
        TipoCategoria tipo,
        int ordem,
        List<ItemResponse> itens) {

    public static CategoriaResponse de(Categoria categoria, List<ItemResponse> itens) {
        return new CategoriaResponse(categoria.getId(), categoria.getNome(), categoria.getTipo(),
                categoria.getOrdem(), itens);
    }
}
