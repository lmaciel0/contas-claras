package dev.lmaciel.contasclaras.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.dto.CadastroRequest;
import dev.lmaciel.contasclaras.auth.dto.DefinirSenhaRequest;
import dev.lmaciel.contasclaras.auth.dto.LoginRequest;
import dev.lmaciel.contasclaras.auth.dto.UsuarioResponse;
import dev.lmaciel.contasclaras.usuario.Usuario;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final TokenService tokens;
    private final SessaoCookie sessaoCookie;

    public AuthController(AuthService auth, TokenService tokens, SessaoCookie sessaoCookie) {
        this.auth = auth;
        this.tokens = tokens;
        this.sessaoCookie = sessaoCookie;
    }

    @PostMapping(path = "/cadastro", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> cadastro(@Valid @RequestBody CadastroRequest req) {
        Usuario usuario = auth.cadastrar(req.nome(), req.email(), req.senha());
        return comSessao(HttpStatus.CREATED, usuario);
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> login(@Valid @RequestBody LoginRequest req) {
        Usuario usuario = auth.autenticar(req.email(), req.senha());
        return comSessao(HttpStatus.OK, usuario);
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, sessaoCookie.limpar().toString())
                .build();
    }

    @GetMapping("/me")
    UsuarioResponse me(@AuthenticationPrincipal Jwt jwt) {
        return UsuarioResponse.de(auth.buscar(UsuarioLogado.de(jwt).id()));
    }

    @PutMapping(path = "/senha", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> definirSenha(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DefinirSenhaRequest req) {
        Usuario usuario = auth.definirSenha(UsuarioLogado.de(jwt).id(), req.senhaAtual(), req.senha());
        // As sessões antigas deixam de valer; este aparelho segue logado com o cookie novo.
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, sessaoCookie.criar(tokens.emitir(usuario)).toString())
                .build();
    }

    private ResponseEntity<UsuarioResponse> comSessao(HttpStatus status, Usuario usuario) {
        String token = tokens.emitir(usuario);
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, sessaoCookie.criar(token).toString())
                .body(UsuarioResponse.de(usuario));
    }
}
