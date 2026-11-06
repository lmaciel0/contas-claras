package dev.lmaciel.aprumo.diagnostico;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.lmaciel.aprumo.auth.IpDoCliente;
import dev.lmaciel.aprumo.diagnostico.dto.RelatoErroRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Recebe os erros que o front não conseguiu tratar. Rota pública (o erro pode ocorrer antes do login), por
 * isso tem limite por IP, só vai para o log (nada no banco) e o log não leva IP nem usuário.
 */
@RestController
@RequestMapping("/api/diagnostico")
public class DiagnosticoController {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticoController.class);
    private static final int MAX_PILHA_NO_LOG = 1000;

    private final LimiteRelatos limite;
    private final IpDoCliente ipDoCliente;

    public DiagnosticoController(LimiteRelatos limite, IpDoCliente ipDoCliente) {
        this.limite = limite;
        this.ipDoCliente = ipDoCliente;
    }

    @PostMapping(path = "/erros", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> relatarErro(@Valid @RequestBody RelatoErroRequest req, HttpServletRequest http) {
        limite.reservar(ipDoCliente.de(http));
        log.warn("erro no front rota={} mensagem={} pilha={}",
                semQuebraDeLinha(req.rota()), semQuebraDeLinha(req.mensagem()),
                semQuebraDeLinha(cortar(req.pilha())));
        return ResponseEntity.noContent().build();
    }

    private static String cortar(String texto) {
        if (texto == null || texto.length() <= MAX_PILHA_NO_LOG) {
            return texto;
        }
        return texto.substring(0, MAX_PILHA_NO_LOG);
    }

    /** Quem relata controla o texto: sem CR/LF ele não consegue forjar uma linha de log. */
    private static String semQuebraDeLinha(String texto) {
        return texto == null ? "" : texto.replace('\r', ' ').replace('\n', ' ');
    }
}
