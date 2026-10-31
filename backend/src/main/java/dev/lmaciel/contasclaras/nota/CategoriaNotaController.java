package dev.lmaciel.contasclaras.nota;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.nota.dto.CategoriaNotaRequest;
import dev.lmaciel.contasclaras.nota.dto.CategoriaNotaResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/categorias-nota")
public class CategoriaNotaController {

    private final CategoriaNotaService categorias;

    public CategoriaNotaController(CategoriaNotaService categorias) {
        this.categorias = categorias;
    }

    @GetMapping
    List<CategoriaNotaResponse> listar(@AuthenticationPrincipal Jwt jwt) {
        return categorias.listar(UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    CategoriaNotaResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CategoriaNotaRequest req) {
        return categorias.criar(req, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    CategoriaNotaResponse editar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody CategoriaNotaRequest req) {
        return categorias.editar(id, req, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        categorias.excluir(id, UsuarioLogado.de(jwt));
    }
}
