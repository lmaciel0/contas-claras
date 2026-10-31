package dev.lmaciel.contasclaras.resumo;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.resumo.dto.ResumoMes;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/resumo")
public class ResumoController {

    private final ResumoService resumos;

    public ResumoController(ResumoService resumos) {
        this.resumos = resumos;
    }

    @GetMapping
    ResumoMes resumo(@AuthenticationPrincipal Jwt jwt,
            @RequestParam @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
            @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.") int ano,
            @RequestParam @Min(value = 1, message = "O mês deve estar entre 1 e 12.")
            @Max(value = 12, message = "O mês deve estar entre 1 e 12.") int mes) {
        return resumos.resumo(ano, mes, UsuarioLogado.de(jwt));
    }
}
