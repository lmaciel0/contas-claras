package dev.lmaciel.contasclaras.comum;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.constraints.NotBlank;

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
                .andExpect(jsonPath("$.erro").value("Não encontrado"));
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
}
