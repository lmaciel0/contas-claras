package dev.lmaciel.contasclaras.tarefa;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
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
}
