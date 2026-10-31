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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.nota.dto.NovaNotaRequest;
import dev.lmaciel.contasclaras.nota.dto.NotaRequest;
import dev.lmaciel.contasclaras.nota.dto.NotaResponse;
import dev.lmaciel.contasclaras.nota.dto.NotaResumoResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/notas")
public class NotaController {

    private final NotaService notas;

    public NotaController(NotaService notas) {
        this.notas = notas;
    }

    @GetMapping
    List<NotaResumoResponse> listar(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(defaultValue = "false") boolean semCategoria) {
        return notas.listar(busca, categoriaId, semCategoria, UsuarioLogado.de(jwt));
    }

    @GetMapping("/{id}")
    NotaResponse obter(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return notas.obter(id, UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    NotaResponse criar(@AuthenticationPrincipal Jwt jwt, @RequestBody(required = false) NovaNotaRequest req) {
        Long categoriaId = req == null ? null : req.categoriaId();
        return notas.criar(categoriaId, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    NotaResponse editar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody NotaRequest req) {
        return notas.editar(id, req, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        notas.excluir(id, UsuarioLogado.de(jwt));
    }
}
