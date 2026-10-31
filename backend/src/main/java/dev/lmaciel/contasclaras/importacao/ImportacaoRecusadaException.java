package dev.lmaciel.contasclaras.importacao;

/** A importação não pode rodar (usuário inexistente ou conta que já tem lançamentos); nada foi gravado. */
public class ImportacaoRecusadaException extends RuntimeException {

    public ImportacaoRecusadaException(String mensagem) {
        super(mensagem);
    }
}
