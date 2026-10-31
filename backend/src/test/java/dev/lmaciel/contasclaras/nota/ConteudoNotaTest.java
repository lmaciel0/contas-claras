package dev.lmaciel.contasclaras.nota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ConteudoNotaTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();

    private JsonNode json(String texto) {
        return mapper.readTree(texto);
    }

    private void aceita(String texto) {
        assertThatCode(() -> ConteudoNota.validar(json(texto))).doesNotThrowAnyException();
    }

    private void recusa(String texto) {
        assertThatThrownBy(() -> ConteudoNota.validar(json(texto)))
                .isInstanceOf(RequisicaoInvalidaException.class)
                .hasMessageNotContaining("Exception");
    }

    private String docComParagrafo(String filho) {
        return "{\"type\":\"doc\",\"content\":[" + filho + "]}";
    }

    /** Documento cuja profundidade é exatamente {@code niveis} (doc conta como nível 1). */
    private String aninhado(int niveis) {
        String folha = "{\"type\":\"paragraph\"}";
        String atual = folha;
        for (int nivel = niveis - 1; nivel >= 2; nivel--) {
            String tipo = nivel % 2 == 0 ? "bulletList" : "listItem";
            atual = "{\"type\":\"" + tipo + "\",\"content\":[" + atual + "]}";
        }
        return "{\"type\":\"doc\",\"content\":[" + atual + "]}";
    }

    /** Documento de um parágrafo com texto de {@code letras} caracteres. */
    private String comTexto(int letras) {
        return docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                + "a".repeat(letras) + "\"}]}");
    }

    @Test
    void aceitaDocumentoVazio() {
        aceita("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}");
        aceita("{\"type\":\"doc\"}");
        assertThatCode(() -> ConteudoNota.validar(ConteudoNota.VAZIO)).doesNotThrowAnyException();
    }

    @Test
    void vazioTemOFormatoEsperado() {
        assertThat(ConteudoNota.VAZIO).isEqualTo(json("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}"));
    }

    @Test
    void aceitaTodosOsTiposPermitidos() {
        aceita("""
                {"type":"doc","content":[
                  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Titulo"}]},
                  {"type":"paragraph","content":[
                    {"type":"text","text":"negrito","marks":[{"type":"bold"}]},
                    {"type":"text","text":"italico","marks":[{"type":"italic"}]},
                    {"type":"text","text":"riscado","marks":[{"type":"strike"},{"type":"bold"}]},
                    {"type":"hardBreak"},
                    {"type":"text","text":"depois"}
                  ]},
                  {"type":"bulletList","content":[
                    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"a"}]}]}
                  ]},
                  {"type":"orderedList","attrs":{"start":3,"type":null},"content":[
                    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"b"}]}]}
                  ]},
                  {"type":"taskList","content":[
                    {"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph"}]},
                    {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
                  ]}
                ]}
                """);
    }

    @Test
    void aceitaOrderedListComOJsonPadraoDoTiptap() {
        aceita(docComParagrafo(
                "{\"type\":\"orderedList\",\"attrs\":{\"start\":1,\"type\":null},\"content\":[]}"));
    }

    @Test
    void recusaOrderedListComStartInvalidoOuTypeLivre() {
        recusa(docComParagrafo("{\"type\":\"orderedList\",\"attrs\":{\"start\":0}}"));
        recusa(docComParagrafo("{\"type\":\"orderedList\",\"attrs\":{\"start\":-2}}"));
        recusa(docComParagrafo("{\"type\":\"orderedList\",\"attrs\":{\"start\":\"1\"}}"));
        recusa(docComParagrafo("{\"type\":\"orderedList\",\"attrs\":{\"start\":1.5}}"));
        recusa(docComParagrafo("{\"type\":\"orderedList\",\"attrs\":{\"type\":\"a\"}}"));
    }

    @Test
    void recusaConteudoNuloOuQueNaoESObjeto() {
        assertThatThrownBy(() -> ConteudoNota.validar(null)).isInstanceOf(RequisicaoInvalidaException.class);
        recusa("null");
        recusa("[]");
        recusa("\"doc\"");
    }

    @Test
    void recusaRaizQueNaoEDoc() {
        recusa("{\"type\":\"paragraph\"}");
        recusa("{\"content\":[]}");
    }

    @Test
    void recusaNoImage() {
        recusa(docComParagrafo("{\"type\":\"image\",\"attrs\":{\"src\":\"http://x/y.png\"}}"));
    }

    @Test
    void recusaMarcaLink() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\","
                + "\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]}]}"));
    }

    @Test
    void recusaMarcaUnderline() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\","
                + "\"marks\":[{\"type\":\"underline\"}]}]}"));
    }

    @Test
    void recusaMarcaComAtributo() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\","
                + "\"marks\":[{\"type\":\"bold\",\"attrs\":{\"style\":\"x\"}}]}]}"));
    }

    @Test
    void recusaAtributoDesconhecidoEmParagrafo() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"attrs\":{\"onclick\":\"alert(1)\"}}"));
    }

    @Test
    void recusaCampoDesconhecidoNoNo() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"html\":\"<b>x</b>\"}"));
    }

    @Test
    void recusaHeadingForaDe1a3() {
        recusa(docComParagrafo("{\"type\":\"heading\",\"attrs\":{\"level\":4}}"));
        recusa(docComParagrafo("{\"type\":\"heading\",\"attrs\":{\"level\":0}}"));
        recusa(docComParagrafo("{\"type\":\"heading\",\"attrs\":{\"level\":\"2\"}}"));
        recusa(docComParagrafo("{\"type\":\"heading\"}"));
        aceita(docComParagrafo("{\"type\":\"heading\",\"attrs\":{\"level\":1}}"));
        aceita(docComParagrafo("{\"type\":\"heading\",\"attrs\":{\"level\":3}}"));
    }

    @Test
    void recusaCheckedNaoBooleano() {
        recusa(docComParagrafo("{\"type\":\"taskList\",\"content\":[{\"type\":\"taskItem\","
                + "\"attrs\":{\"checked\":\"true\"}}]}"));
        recusa(docComParagrafo("{\"type\":\"taskList\",\"content\":[{\"type\":\"taskItem\","
                + "\"attrs\":{\"checked\":1}}]}"));
    }

    @Test
    void recusaTextSemCampoText() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\"}]}"));
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":5}]}"));
    }

    @Test
    void recusaTextoForaDeNoText() {
        recusa(docComParagrafo("{\"type\":\"paragraph\",\"text\":\"solto\"}"));
    }

    @Test
    void recusaDocAninhado() {
        recusa(docComParagrafo("{\"type\":\"doc\"}"));
    }

    @Test
    void recusaAninhamentoAcimaDe20Niveis() {
        recusa(aninhado(21));
    }

    @Test
    void aceitaAninhamentoDe20Niveis() {
        aceita(aninhado(20));
    }

    @Test
    void recusaMaisDe100000Caracteres() {
        int sobra = json(comTexto(0)).toString().length();
        recusa(comTexto(100001 - sobra));
    }

    @Test
    void aceitaExatamente100000Caracteres() {
        int sobra = json(comTexto(0)).toString().length();
        String texto = comTexto(100000 - sobra);
        assertThat(json(texto).toString()).hasSize(100000);
        aceita(texto);
    }

    @Test
    void scriptEmTextoEAceitoComoTextoMasNuncaComoNo() {
        JsonNode doc = json(docComParagrafo("{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"<script>alert(1)</script>\"}]}"));
        assertThatCode(() -> ConteudoNota.validar(doc)).doesNotThrowAnyException();
        assertThat(ConteudoNota.textoSimples(doc)).isEqualTo("<script>alert(1)</script>");
        recusa(docComParagrafo("{\"type\":\"script\"}"));
    }

    @Test
    void textoSimplesSeparaBlocosComQuebraDeLinha() {
        assertThat(ConteudoNota.textoSimples(json(docComParagrafo(
                "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Olá\"}]},"
                        + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"mundo\"}]}"))))
                .isEqualTo("Olá\nmundo");
    }

    @Test
    void textoSimplesTrataItemDeCaixinhaEHardBreak() {
        JsonNode doc = json("""
                {"type":"doc","content":[
                  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Lista"}]},
                  {"type":"taskList","content":[
                    {"type":"taskItem","attrs":{"checked":true},"content":[
                      {"type":"paragraph","content":[{"type":"text","text":"pao"}]}]},
                    {"type":"taskItem","attrs":{"checked":false},"content":[
                      {"type":"paragraph","content":[{"type":"text","text":"leite"}]}]}
                  ]},
                  {"type":"paragraph","content":[
                    {"type":"text","text":"linha1"},{"type":"hardBreak"},{"type":"text","text":"linha2"}]}
                ]}
                """);
        assertThat(ConteudoNota.textoSimples(doc)).isEqualTo("Lista\npao\nleite\nlinha1\nlinha2");
    }

    @Test
    void textoSimplesDeListaComMarcasEPontasLimpas() {
        JsonNode doc = json("""
                {"type":"doc","content":[
                  {"type":"bulletList","content":[
                    {"type":"listItem","content":[{"type":"paragraph","content":[
                      {"type":"text","text":"  um ","marks":[{"type":"bold"}]},{"type":"text","text":"dois  "}]}]}
                  ]}
                ]}
                """);
        assertThat(ConteudoNota.textoSimples(doc)).isEqualTo("um dois");
    }

    @Test
    void textoSimplesDeDocumentoVazioEVazio() {
        assertThat(ConteudoNota.textoSimples(ConteudoNota.VAZIO)).isEmpty();
        assertThat(ConteudoNota.textoSimples(json("{\"type\":\"doc\"}"))).isEmpty();
    }
}
