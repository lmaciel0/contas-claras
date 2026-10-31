package dev.lmaciel.contasclaras.comum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ch.qos.logback.classic.Level;
import dev.lmaciel.contasclaras.CapturaLog;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

class ApiExceptionHandlerTest {

    record Corpo(@NotBlank(message = "Informe o nome") String nome) {
    }

    @RestController
    static class SondaController {

        @GetMapping("/sonda/nao-encontrado")
        void naoEncontrado() {
            throw new NaoEncontradoException();
        }

        @GetMapping("/sonda/conflito")
        void conflito() {
            throw new ConflitoException("Já existe uma categoria com esse nome");
        }

        @GetMapping("/sonda/violacao")
        void violacao() {
            try (var fabrica = Validation.buildDefaultValidatorFactory()) {
                throw new ConstraintViolationException(fabrica.getValidator().validate(new Corpo(" ")));
            }
        }

        @PostMapping("/sonda/validar")
        void validar(@Valid @RequestBody Corpo corpo) {
        }

        @GetMapping("/sonda/parametro")
        void parametro(@RequestParam @Size(min = 3, message = "Informe ao menos 3 letras") String q) {
        }

        @GetMapping("/sonda/erro")
        void erro() {
            throw new IllegalStateException("detalhe interno que não pode vazar");
        }
    }

    MockMvc mvc;

    @BeforeEach
    void montar() {
        mvc = MockMvcBuilders.standaloneSetup(new SondaController())
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void nao_encontrado_vira_404() throws Exception {
        mvc.perform(get("/sonda/nao-encontrado"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Não encontrado."));
    }

    @Test
    void conflito_vira_409_com_a_mensagem() throws Exception {
        mvc.perform(get("/sonda/conflito"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe uma categoria com esse nome"));
    }

    @Test
    void corpo_invalido_vira_400_com_a_primeira_mensagem() throws Exception {
        mvc.perform(post("/sonda/validar").contentType(MediaType.APPLICATION_JSON).content("{\"nome\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome"));
    }

    @Test
    void constraint_violation_vira_400_com_a_primeira_mensagem() throws Exception {
        mvc.perform(get("/sonda/violacao"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome"));
    }

    @Test
    void json_malformado_vira_400_requisicao_invalida() throws Exception {
        mvc.perform(post("/sonda/validar").contentType(MediaType.APPLICATION_JSON).content("{\"nome\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Requisição inválida."));
    }

    @Test
    void validacao_de_parametro_vira_400_com_a_primeira_mensagem() throws Exception {
        mvc.perform(get("/sonda/parametro").param("q", "ab"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe ao menos 3 letras"));
    }

    @Test
    void excecao_nao_tratada_vira_500_sem_vazar_detalhes() throws Exception {
        try (CapturaLog log = CapturaLog.de(ApiExceptionHandler.class)) {
            mvc.perform(get("/sonda/erro"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.erro").value("Erro interno."))
                    .andExpect(content().string(not(containsString("detalhe interno"))));

            assertThat(log.eventos()).hasSize(1);
            assertThat(log.eventos().get(0).getLevel()).isEqualTo(Level.ERROR);
            assertThat(log.eventos().get(0).getThrowableProxy().getMessage()).contains("detalhe interno");
        }
    }

    @Test
    void content_type_nao_suportado_continua_415_com_corpo_erro() throws Exception {
        mvc.perform(post("/sonda/validar").contentType(MediaType.TEXT_PLAIN).content("nome=x"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void metodo_nao_suportado_continua_405_com_corpo_erro() throws Exception {
        try (CapturaLog log = CapturaLog.de("org.springframework.web.servlet.PageNotFound")) {
            mvc.perform(delete("/sonda/erro"))
                    .andExpect(status().isMethodNotAllowed())
                    .andExpect(jsonPath("$.erro").isNotEmpty());

            assertThat(log.eventos()).hasSize(1);
        }
    }
}
