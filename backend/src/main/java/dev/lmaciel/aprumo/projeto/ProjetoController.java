package dev.lmaciel.aprumo.projeto;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.projeto.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projetos")
public class ProjetoController {

    private final ProjetoService projetos;

    public ProjetoController(ProjetoService projetos) {
        this.projetos = projetos;
    }

    @GetMapping
    public List<ProjetoResposta> listar(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) PrioridadeProjeto prioridade
    ) {
        return projetos.listar(UsuarioLogado.de(jwt), busca, prioridade);
    }

    @GetMapping("/{id}")
    public ProjetoResposta obterPorId(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return projetos.obterPorId(id, UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProjetoResposta criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProjetoCriacaoRequisicao req) {
        return projetos.criar(req, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ProjetoResposta atualizar(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @Valid @RequestBody ProjetoEdicaoRequisicao req
    ) {
        return projetos.atualizar(id, req, UsuarioLogado.de(jwt));
    }

    @PatchMapping(path = "/{id}/estagio", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ProjetoResposta moverEstagio(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @Valid @RequestBody ProjetoMoverEstagioRequisicao req
    ) {
        return projetos.moverEstagio(id, req, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        projetos.excluir(id, UsuarioLogado.de(jwt));
    }

    @PostMapping(path = "/{id}/subtarefas", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public SubtarefaResposta adicionarSubtarefa(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @Valid @RequestBody SubtarefaCriacaoRequisicao req
    ) {
        return projetos.adicionarSubtarefa(id, req, UsuarioLogado.de(jwt));
    }

    @PatchMapping("/{id}/subtarefas/{subtarefaId}/alternar")
    public SubtarefaResposta alternarSubtarefa(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @PathVariable long subtarefaId
    ) {
        return projetos.alternarSubtarefa(id, subtarefaId, UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}/subtarefas/{subtarefaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirSubtarefa(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @PathVariable long subtarefaId
    ) {
        projetos.excluirSubtarefa(id, subtarefaId, UsuarioLogado.de(jwt));
    }
}
