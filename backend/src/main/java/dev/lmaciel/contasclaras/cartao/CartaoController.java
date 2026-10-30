package dev.lmaciel.contasclaras.cartao;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.cartao.dto.CartoesMes;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/cartoes")
public class CartaoController {

    private final CartaoService cartoes;

    public CartaoController(CartaoService cartoes) {
        this.cartoes = cartoes;
    }

    @GetMapping
    CartoesMes cartoes(@AuthenticationPrincipal Jwt jwt,
            @RequestParam @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
            @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.") int ano,
            @RequestParam @Min(value = 1, message = "O mês deve estar entre 1 e 12.")
            @Max(value = 12, message = "O mês deve estar entre 1 e 12.") int mes) {
        return cartoes.cartoes(ano, mes, UsuarioLogado.de(jwt));
    }
}
