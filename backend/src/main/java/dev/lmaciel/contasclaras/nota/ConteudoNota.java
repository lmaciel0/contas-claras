package dev.lmaciel.contasclaras.nota;

import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Conteúdo de uma nota: JSON do editor Tiptap. Só entra o que está na lista permitida (tipos de nó, marcas e
 * atributos); qualquer outra coisa é recusada com 400. Nunca se abre atributo livre.
 */
public final class ConteudoNota {

    public static final int MAX_CARACTERES = 100_000;
    public static final int MAX_PROFUNDIDADE = 20;

    /** Documento vazio: um parágrafo sem texto. */
    public static final JsonNode VAZIO = JsonMapper.builder().build()
            .readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}");

    private static final Set<String> BLOCOS_DE_LINHA = Set.of("paragraph", "heading", "listItem", "taskItem");
    private static final Set<String> CAMPOS_DO_NO = Set.of("type", "attrs", "content", "marks", "text");
    private static final Set<String> MARCAS = Set.of("bold", "italic", "strike");

    /** Tipo de nó para seus atributos permitidos, cada um com o critério de valor. */
    private static final Map<String, Map<String, Atributo>> NOS = Map.of(
            "doc", Map.of(),
            "paragraph", Map.of(),
            "text", Map.of(),
            "heading", Map.of("level", new Atributo(true, v -> v.isIntegralNumber() && v.canConvertToInt()
                    && v.intValue() >= 1 && v.intValue() <= 3)),
            "bulletList", Map.of(),
            // Tiptap 3 emite {"start":1,"type":null}; "type" só vale nulo, "start" é inteiro positivo.
            "orderedList", Map.of(
                    "start", new Atributo(false, v -> v.isIntegralNumber() && v.canConvertToInt()
                            && v.intValue() >= 1),
                    "type", new Atributo(false, JsonNode::isNull)),
            "listItem", Map.of(),
            "taskList", Map.of(),
            "taskItem", Map.of("checked", new Atributo(false, JsonNode::isBoolean)),
            "hardBreak", Map.of());

    private record Atributo(boolean obrigatorio, Predicate<JsonNode> valido) {
    }

    private ConteudoNota() {
    }

    /** Valida o documento inteiro; lança {@link RequisicaoInvalidaException} se algo sair da lista permitida. */
    public static void validar(JsonNode conteudo) {
        if (conteudo == null || !conteudo.isObject()) {
            throw invalido("O conteúdo da nota deve ser um documento.");
        }
        if (conteudo.toString().length() > MAX_CARACTERES) {
            throw invalido("O conteúdo da nota passa de " + MAX_CARACTERES + " caracteres.");
        }
        if (!"doc".equals(textoDe(conteudo.get("type")))) {
            throw invalido("O conteúdo da nota deve começar em um documento.");
        }
        validarNo(conteudo, 1);
    }

    /** Texto puro da nota: nós de texto juntos, blocos e quebras de linha separados por {@code \n}. */
    public static String textoSimples(JsonNode conteudo) {
        StringBuilder texto = new StringBuilder();
        if (conteudo != null) {
            coletar(conteudo, texto);
        }
        StringBuilder limpo = new StringBuilder();
        for (String linha : texto.toString().split("\n", -1)) {
            if (!limpo.isEmpty()) {
                limpo.append('\n');
            }
            limpo.append(linha.strip());
        }
        return limpo.toString().strip();
    }

    private static void coletar(JsonNode no, StringBuilder texto) {
        String tipo = textoDe(no.get("type"));
        if ("text".equals(tipo)) {
            String conteudo = textoDe(no.get("text"));
            if (conteudo != null) {
                texto.append(conteudo);
            }
            return;
        }
        if ("hardBreak".equals(tipo)) {
            texto.append('\n');
            return;
        }
        if (BLOCOS_DE_LINHA.contains(tipo) && !texto.isEmpty() && texto.charAt(texto.length() - 1) != '\n') {
            texto.append('\n');
        }
        JsonNode filhos = no.get("content");
        if (filhos != null && filhos.isArray()) {
            for (JsonNode filho : filhos) {
                coletar(filho, texto);
            }
        }
    }

    private static void validarNo(JsonNode no, int profundidade) {
        if (profundidade > MAX_PROFUNDIDADE) {
            throw invalido("O conteúdo da nota tem mais de " + MAX_PROFUNDIDADE + " níveis de aninhamento.");
        }
        if (!no.isObject()) {
            throw invalido("O conteúdo da nota tem um item que não é um nó válido.");
        }
        for (String campo : no.propertyNames()) {
            if (!CAMPOS_DO_NO.contains(campo)) {
                throw invalido("O conteúdo da nota tem um campo não permitido: " + campo + ".");
            }
        }
        String tipo = textoDe(no.get("type"));
        Map<String, Atributo> permitidos = tipo == null ? null : NOS.get(tipo);
        if (permitidos == null) {
            throw invalido("O conteúdo da nota tem um tipo de item não permitido.");
        }
        validarAtributos(tipo, no.get("attrs"), permitidos);

        boolean ehTexto = "text".equals(tipo);
        if (ehTexto) {
            JsonNode texto = no.get("text");
            if (texto == null || !texto.isString()) {
                throw invalido("Um item de texto da nota está sem o campo de texto.");
            }
            if (no.has("content")) {
                throw invalido("Um item de texto da nota não pode ter filhos.");
            }
            validarMarcas(no.get("marks"));
        } else {
            if (no.has("text")) {
                throw invalido("Só itens de texto podem ter o campo de texto.");
            }
            if (no.has("marks")) {
                throw invalido("Só itens de texto podem ter marcas.");
            }
        }

        JsonNode filhos = no.get("content");
        if (filhos == null || filhos.isNull()) {
            return;
        }
        if (!filhos.isArray() || "hardBreak".equals(tipo)) {
            throw invalido("O conteúdo da nota tem filhos em formato inválido.");
        }
        for (JsonNode filho : filhos) {
            if (filho != null && filho.isObject() && "doc".equals(textoDe(filho.get("type")))) {
                throw invalido("O documento não pode aparecer dentro de outro item.");
            }
            validarNo(filho, profundidade + 1);
        }
    }

    private static void validarAtributos(String tipo, JsonNode attrs, Map<String, Atributo> permitidos) {
        if (attrs == null || attrs.isNull()) {
            exigirObrigatorios(tipo, permitidos, null);
            return;
        }
        if (!attrs.isObject()) {
            throw invalido("Os atributos de um item da nota estão em formato inválido.");
        }
        for (Map.Entry<String, JsonNode> entrada : attrs.properties()) {
            Atributo atributo = permitidos.get(entrada.getKey());
            if (atributo == null) {
                throw invalido("O conteúdo da nota tem um atributo não permitido: " + entrada.getKey() + ".");
            }
            if (!atributo.valido().test(entrada.getValue())) {
                throw invalido("O atributo " + entrada.getKey() + " de " + tipo + " tem um valor inválido.");
            }
        }
        exigirObrigatorios(tipo, permitidos, attrs);
    }

    private static void exigirObrigatorios(String tipo, Map<String, Atributo> permitidos, JsonNode attrs) {
        for (Map.Entry<String, Atributo> entrada : permitidos.entrySet()) {
            if (entrada.getValue().obrigatorio() && (attrs == null || !attrs.has(entrada.getKey()))) {
                throw invalido("O atributo " + entrada.getKey() + " de " + tipo + " é obrigatório.");
            }
        }
    }

    private static void validarMarcas(JsonNode marcas) {
        if (marcas == null || marcas.isNull()) {
            return;
        }
        if (!marcas.isArray()) {
            throw invalido("As marcas de um texto da nota estão em formato inválido.");
        }
        for (JsonNode marca : marcas) {
            if (!marca.isObject()) {
                throw invalido("Uma marca de texto da nota está em formato inválido.");
            }
            for (String campo : marca.propertyNames()) {
                if (!"type".equals(campo) && !"attrs".equals(campo)) {
                    throw invalido("Uma marca de texto da nota tem um campo não permitido: " + campo + ".");
                }
            }
            String tipo = textoDe(marca.get("type"));
            if (tipo == null || !MARCAS.contains(tipo)) {
                throw invalido("O conteúdo da nota tem uma marca de texto não permitida.");
            }
            JsonNode attrs = marca.get("attrs");
            boolean semAtributos = attrs == null || attrs.isNull() || (attrs.isObject() && attrs.isEmpty());
            if (!semAtributos) {
                throw invalido("A marca " + tipo + " não aceita atributos.");
            }
        }
    }

    private static String textoDe(JsonNode no) {
        return no != null && no.isString() ? no.stringValue() : null;
    }

    private static RequisicaoInvalidaException invalido(String mensagem) {
        return new RequisicaoInvalidaException(mensagem);
    }
}
