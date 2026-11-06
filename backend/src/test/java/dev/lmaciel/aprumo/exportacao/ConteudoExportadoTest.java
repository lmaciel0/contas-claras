package dev.lmaciel.aprumo.exportacao;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class ConteudoExportadoTest {

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void jsonValidoViraArvore() {
        assertThat(ConteudoExportado.de(json, "{\"type\":\"doc\"}").get("type").stringValue()).isEqualTo("doc");
    }

    @Test
    void nuloContinuaNulo() {
        assertThat(ConteudoExportado.de(json, null)).isNull();
    }

    @Test
    void malformadoVaiComoTextoCru() {
        var no = ConteudoExportado.de(json, "{quebrado");
        assertThat(no.isString()).isTrue();
        assertThat(no.stringValue()).isEqualTo("{quebrado");
    }
}
