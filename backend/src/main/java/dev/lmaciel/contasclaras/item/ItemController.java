package dev.lmaciel.contasclaras.item;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.item.dto.ItemRequest;
import dev.lmaciel.contasclaras.item.dto.ItemResponse;
import jakarta.validation.Valid;

@RestController
public class ItemController {

    private final ItemService itens;

    public ItemController(ItemService itens) {
        this.itens = itens;
    }

    @PostMapping(path = "/api/categorias/{categoriaId}/itens", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ItemResponse criar(@AuthenticationPrincipal Jwt jwt, @PathVariable long categoriaId,
            @Valid @RequestBody ItemRequest req) {
        return ItemResponse.de(itens.criar(categoriaId, req, UsuarioLogado.de(jwt)));
    }

    @PutMapping(path = "/api/itens/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    ItemResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody ItemRequest req) {
        return ItemResponse.de(itens.atualizar(id, req, UsuarioLogado.de(jwt)));
    }
}
