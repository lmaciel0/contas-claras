package dev.lmaciel.contasclaras.lancamento;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.lancamento.dto.LancamentoResponse;
import dev.lmaciel.contasclaras.lancamento.dto.SalvarLancamentoRequest;
import dev.lmaciel.contasclaras.lancamento.dto.StatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/lancamentos")
public class LancamentoController {

    private final LancamentoService lancamentos;

    public LancamentoController(LancamentoService lancamentos) {
        this.lancamentos = lancamentos;
    }

    @GetMapping
    List<LancamentoResponse> listar(@AuthenticationPrincipal Jwt jwt,
            @RequestParam @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
            @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.") int ano,
            @RequestParam @Min(value = 1, message = "O mês deve estar entre 1 e 12.")
            @Max(value = 12, message = "O mês deve estar entre 1 e 12.") int mes) {
        return lancamentos.listar(ano, mes, UsuarioLogado.de(jwt));
    }

    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    List<LancamentoResponse> salvar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SalvarLancamentoRequest req) {
        return lancamentos.salvar(req, UsuarioLogado.de(jwt));
    }

    @PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    LancamentoResponse mudarStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody StatusRequest req) {
        return lancamentos.mudarStatus(id, req.status(), UsuarioLogado.de(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        lancamentos.excluir(id, UsuarioLogado.de(jwt));
    }
}
