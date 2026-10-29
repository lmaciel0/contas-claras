package dev.lmaciel.contasclaras.auth;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Lista de e-mails que podem criar conta (variável {@code ALLOWED_EMAILS}, separada por vírgula).
 * Comparação sem diferenciar maiúsculas e sem espaços nas pontas; lista vazia não libera ninguém.
 */
@Component
public class EmailsLiberados {

    private final Set<String> liberados;

    public EmailsLiberados(@Value("${app.allowed-emails:}") String lista) {
        this.liberados = lista == null ? Set.of() : Arrays.stream(lista.split(","))
                .map(Emails::normalizar)
                .filter(email -> !email.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean permite(String email) {
        return email != null && liberados.contains(Emails.normalizar(email));
    }
}
