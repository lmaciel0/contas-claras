package dev.lmaciel.contasclaras.categoria;

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
import dev.lmaciel.contasclaras.categoria.dto.CategoriaRequest;
import dev.lmaciel.contasclaras.categoria.dto.CategoriaResponse;
import dev.lmaciel.contasclaras.categoria.dto.OrdemRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categorias;

    public CategoriaController(CategoriaService categorias) {
        this.categorias = categorias;
    }

    @GetMapping
    List<CategoriaResponse> listar(@AuthenticationPrincipal Jwt jwt) {
        return categorias.listar(UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    CategoriaResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CategoriaRequest req) {
        return categorias.criar(req, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/ordem", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reordenar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OrdemRequest req) {
        categorias.reordenar(req.ids(), UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    CategoriaResponse renomear(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody CategoriaRequest req) {
        return categorias.renomear(id, req, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        categorias.excluir(id, UsuarioLogado.de(jwt));
    }
}
