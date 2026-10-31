package dev.lmaciel.contasclaras.saude;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    record StatusSaude(String status) {
    }

    @GetMapping("/api/health")
    StatusSaude health() {
        return new StatusSaude("ok");
    }
}
