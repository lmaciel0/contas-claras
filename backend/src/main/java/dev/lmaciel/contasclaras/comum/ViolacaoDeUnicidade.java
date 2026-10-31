package dev.lmaciel.contasclaras.comum;

import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Distingue "restrição única violada" de outras violações de integridade. A checagem prévia de nome
 * duplicado não basta (duas requisições simultâneas passam por ela), então a palavra final é do banco.
 */
public final class ViolacaoDeUnicidade {

    private ViolacaoDeUnicidade() {
    }

    public static boolean ocorreu(DataIntegrityViolationException e) {
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa instanceof ConstraintViolationException violacao
                    && violacao.getKind() == ConstraintKind.UNIQUE) {
                return true;
            }
        }
        return false;
    }
}
