package dev.lmaciel.aprumo.exportacao;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.StringNode;

/** Conteúdo de nota para a exportação: nunca derruba a exportação inteira com um 500. */
final class ConteudoExportado {

    private ConteudoExportado() {
    }

    /** O JSON lido; se vier nulo, {@code null}; se vier malformado, o texto cru como string. */
    static JsonNode de(ObjectMapper json, String bruto) {
        if (bruto == null) {
            return null;
        }
        try {
            return json.readTree(bruto);
        } catch (JacksonException e) {
            return StringNode.valueOf(bruto);
        }
    }
}
