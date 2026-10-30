package dev.lmaciel.contasclaras.comum;

import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Distingue "chave estrangeira violada" de outras violações de integridade. A checagem prévia de
 * lançamentos não basta (um lançamento pode surgir logo depois dela), então a palavra final é do banco.
 */
public final class ViolacaoDeChaveEstrangeira {

    private ViolacaoDeChaveEstrangeira() {
    }

    public static boolean ocorreu(DataIntegrityViolationException e) {
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa instanceof ConstraintViolationException violacao
                    && violacao.getKind() == ConstraintKind.FOREIGN_KEY) {
                return true;
            }
        }
        return false;
    }
}
