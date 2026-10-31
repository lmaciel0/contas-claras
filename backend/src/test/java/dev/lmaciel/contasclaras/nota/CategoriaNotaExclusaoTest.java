package dev.lmaciel.contasclaras.nota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.Cookie;

class CategoriaNotaExclusaoTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    @Test
    void excluirCategoriaMantemNotasSemCategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long categoria = criarCategoria(sessao, "Saúde");
        long a = criarNota(sessao, categoria);
        long b = criarNota(sessao, categoria);

        mvc.perform(get("/api/categorias-nota").cookie(sessao))
                .andExpect(jsonPath("$[0].totalNotas").value(2));

        mvc.perform(delete("/api/categorias-nota/" + categoria).cookie(sessao))
                .andExpect(status().isNoContent());

        assertThat(contarNotas()).isEqualTo(2);
        for (long id : new long[] { a, b }) {
            mvc.perform(get(URL + "/" + id).cookie(sessao))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.categoriaId").doesNotExist());
        }
    }
}
