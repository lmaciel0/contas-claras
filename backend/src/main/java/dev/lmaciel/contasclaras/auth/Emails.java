package dev.lmaciel.contasclaras.auth;

import java.util.Locale;

final class Emails {

    private Emails() {
    }

    /** Forma canônica usada em todo lugar: sem espaços nas pontas e em minúsculas. */
    static String normalizar(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
