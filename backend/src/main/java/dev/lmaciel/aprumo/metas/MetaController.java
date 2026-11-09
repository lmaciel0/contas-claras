package dev.lmaciel.aprumo.metas;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.metas.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metas")
public class MetaController {

    private final MetaService metas;

    public MetaController(MetaService metas) {
        this.metas = metas;
    }

    @GetMapping
    public List<MetaResponse> listar(@AuthenticationPrincipal Jwt jwt) {
        return metas.listar(UsuarioLogado.de(jwt));
    }

    @GetMapping("/{id}")
    public MetaResponse obterPorId(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return metas.obterPorId(id, UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MetaResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MetaRequest req) {
        return metas.criar(req, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public MetaResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @Valid @RequestBody MetaRequest req) {
        return metas.atualizar(id, req, UsuarioLogado.de(jwt));
    }

    @PatchMapping(path = "/{id}/guardar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public MetaResponse guardar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @Valid @RequestBody AporteMetaRequest req) {
        return metas.guardar(id, req, UsuarioLogado.de(jwt));
    }

    @PatchMapping(path = "/{id}/resgatar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public MetaResponse resgatar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @Valid @RequestBody AporteMetaRequest req) {
        return metas.resgatar(id, req, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        metas.excluir(id, UsuarioLogado.de(jwt));
    }

    @GetMapping("/conselheiro")
    public ResumoConselheiroResponse obterConselheiro(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam int ano,
            @RequestParam int mes
    ) {
        return metas.obterConselheiro(ano, mes, UsuarioLogado.de(jwt));
    }
}
