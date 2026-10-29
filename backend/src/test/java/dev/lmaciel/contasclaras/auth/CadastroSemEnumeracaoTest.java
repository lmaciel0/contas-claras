package dev.lmaciel.contasclaras.auth;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;

/**
 * O cadastro não pode revelar quais e-mails têm conta: e-mail fora da lista e e-mail já cadastrado
 * respondem igual, e os dois gastam o mesmo BCrypt (o tempo não denuncia o caminho).
 */
class CadastroSemEnumeracaoTest extends IntegracaoTest {

    private static final String MENSAGEM = "Não foi possível criar a conta com este e-mail.";
    private static final String SENHA = "senha-segura-1";

    @MockitoSpyBean
    PasswordEncoder encoder;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private ResultActions cadastrar(String email) throws Exception {
        return mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Fulano\",\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, SENHA)));
    }

    @Test
    void email_nao_liberado_gasta_bcrypt_e_responde_403_generico() throws Exception {
        cadastrar("intruso@exemplo.com")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value(MENSAGEM));

        verify(encoder).encode(SENHA);
    }

    @Test
    void email_ja_cadastrado_gasta_bcrypt_e_responde_o_mesmo_403() throws Exception {
        cadastrar("dono@exemplo.com").andExpect(status().isCreated());

        cadastrar("dono@exemplo.com")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value(MENSAGEM));

        // uma vez no primeiro cadastro, outra no repetido
        verify(encoder, times(2)).encode(SENHA);
    }
}
