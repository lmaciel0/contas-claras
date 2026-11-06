package dev.lmaciel.aprumo.exportacao;

import java.time.Clock;
import java.time.LocalDate;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.exportacao.dto.ExportacaoResponse;

@RestController
public class ExportacaoController {

    private final ExportacaoService exportacao;
    private final Clock clock;

    public ExportacaoController(ExportacaoService exportacao, Clock clock) {
        this.exportacao = exportacao;
        this.clock = clock;
    }

    /** Baixa os dados da conta em JSON. Fica sob /api/auth/conta, junto de "excluir conta"; exige sessão. */
    @GetMapping(path = "/api/auth/conta/exportacao", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<ExportacaoResponse> exportar(@AuthenticationPrincipal Jwt jwt) {
        ExportacaoResponse corpo = exportacao.exportar(UsuarioLogado.de(jwt));
        String arquivo = "aprumo-dados-" + LocalDate.now(clock) + ".json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(arquivo).build().toString())
                .cacheControl(CacheControl.noStore())
                .body(corpo);
    }
}
