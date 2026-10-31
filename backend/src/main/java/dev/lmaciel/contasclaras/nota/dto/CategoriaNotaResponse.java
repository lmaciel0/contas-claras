package dev.lmaciel.contasclaras.nota.dto;

import dev.lmaciel.contasclaras.nota.CategoriaNota;

public record CategoriaNotaResponse(long id, String nome, String cor, long totalNotas) {

    public static CategoriaNotaResponse de(CategoriaNota categoria, long totalNotas) {
        return new CategoriaNotaResponse(categoria.getId(), categoria.getNome(), categoria.getCor(), totalNotas);
    }
}
