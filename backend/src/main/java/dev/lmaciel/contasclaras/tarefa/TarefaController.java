package dev.lmaciel.contasclaras.tarefa;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.tarefa.dto.ConcluirRequest;
import dev.lmaciel.contasclaras.tarefa.dto.TarefaRequest;
import dev.lmaciel.contasclaras.tarefa.dto.TarefaResponse;
import dev.lmaciel.contasclaras.tarefa.dto.TarefasResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tarefas")
public class TarefaController {

    private final TarefaService tarefas;

    public TarefaController(TarefaService tarefas) {
        this.tarefas = tarefas;
    }

    @GetMapping
    TarefasResponse listar(@AuthenticationPrincipal Jwt jwt) {
        return tarefas.listar(UsuarioLogado.de(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    TarefaResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TarefaRequest req) {
        return tarefas.criar(req, UsuarioLogado.de(jwt));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    TarefaResponse editar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody TarefaRequest req) {
        return tarefas.editar(id, req, UsuarioLogado.de(jwt));
    }

    @PatchMapping(path = "/{id}/concluida", consumes = MediaType.APPLICATION_JSON_VALUE)
    TarefaResponse concluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody ConcluirRequest req) {
        return tarefas.concluir(id, req.concluida(), UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        tarefas.excluir(id, UsuarioLogado.de(jwt));
    }
}
