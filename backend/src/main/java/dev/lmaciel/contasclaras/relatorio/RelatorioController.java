package dev.lmaciel.contasclaras.relatorio;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.relatorio.dto.RelatorioAno;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioService relatorios;

    public RelatorioController(RelatorioService relatorios) {
        this.relatorios = relatorios;
    }

    @GetMapping("/ano/{ano}")
    RelatorioAno ano(@AuthenticationPrincipal Jwt jwt,
            @PathVariable @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
            @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.") int ano) {
        return relatorios.ano(ano, UsuarioLogado.de(jwt));
    }
}
