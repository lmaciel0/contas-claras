package dev.lmaciel.contasclaras.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.contasclaras.auth.dto.CadastroRequest;
import dev.lmaciel.contasclaras.auth.dto.ConfirmarCadastroRequest;
import dev.lmaciel.contasclaras.auth.dto.DefinirSenhaRequest;
import dev.lmaciel.contasclaras.auth.dto.EmailRequest;
import dev.lmaciel.contasclaras.auth.dto.GoogleLoginRequest;
import dev.lmaciel.contasclaras.auth.dto.LoginRequest;
import dev.lmaciel.contasclaras.auth.dto.RedefinirSenhaRequest;
import dev.lmaciel.contasclaras.auth.dto.UsuarioResponse;
import dev.lmaciel.contasclaras.usuario.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final FluxoEmailService fluxoEmail;
    private final TokenService tokens;
    private final SessaoCookie sessaoCookie;

    public AuthController(AuthService auth, FluxoEmailService fluxoEmail, TokenService tokens,
            SessaoCookie sessaoCookie) {
        this.auth = auth;
        this.fluxoEmail = fluxoEmail;
        this.tokens = tokens;
        this.sessaoCookie = sessaoCookie;
    }

    /** Sempre 202 sem corpo e sem cookie: a conta só nasce na confirmação por e-mail. */
    @PostMapping(path = "/cadastro", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> cadastro(@Valid @RequestBody CadastroRequest req, HttpServletRequest http) {
        fluxoEmail.pedirCadastro(req.nome(), req.email(), http.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping(path = "/cadastro/reenviar", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> reenviarCadastro(@Valid @RequestBody EmailRequest req, HttpServletRequest http) {
        fluxoEmail.reenviarCadastro(req.email(), http.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    /** Confirma por {@code email} e {@code codigo}, ou só por {@code token} (o do link), e define a senha da conta. */
    @PostMapping(path = "/cadastro/confirmar", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> confirmarCadastro(@Valid @RequestBody ConfirmarCadastroRequest req) {
        Usuario usuario;
        if (StringUtils.hasText(req.token())) {
            usuario = fluxoEmail.confirmarCadastroPorToken(req.token(), req.senha());
        } else if (StringUtils.hasText(req.email()) && req.codigo() != null) {
            usuario = fluxoEmail.confirmarCadastro(req.email(), req.codigo(), req.senha());
        } else {
            throw FluxoEmailService.codigoInvalido();
        }
        return comSessao(HttpStatus.CREATED, usuario);
    }

    /** Sempre 202: com ou sem conta, sai um e-mail. */
    @PostMapping(path = "/esqueci-senha", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> esqueciSenha(@Valid @RequestBody EmailRequest req, HttpServletRequest http) {
        fluxoEmail.esqueciSenha(req.email(), http.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping(path = "/redefinir-senha", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequest req) {
        Usuario usuario = fluxoEmail.redefinirSenha(req.email(), req.codigo(), req.senha());
        return comSessao(HttpStatus.OK, usuario);
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> login(@Valid @RequestBody LoginRequest req) {
        Usuario usuario = auth.autenticar(req.email(), req.senha());
        return comSessao(HttpStatus.OK, usuario);
    }

    @PostMapping(path = "/google", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<UsuarioResponse> google(@Valid @RequestBody GoogleLoginRequest req) {
        Usuario usuario = auth.entrarComGoogle(auth.verificarGoogle(req.credential()));
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
