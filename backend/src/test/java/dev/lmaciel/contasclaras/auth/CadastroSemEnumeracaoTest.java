package dev.lmaciel.contasclaras.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;

/**
 * O cadastro não pode revelar quais e-mails têm conta: com ou sem conta, a resposta é a mesma, o BCrypt roda
 * nos dois casos (o tempo não denuncia o caminho) e sai exatamente um e-mail.
 */
class CadastroSemEnumeracaoTest extends IntegracaoTest {

    private static final String SENHA = "senha-segura-1";

    @MockitoSpyBean
    PasswordEncoder encoder;

    @Autowired
    AuthService auth;

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
    void com_ou_sem_conta_gasta_bcrypt_responde_igual_e_envia_um_email() throws Exception {
        auth.criarUsuario("Dono", "dono@exemplo.com", encoder.encode("outra-senha-9"), null);

        for (String email : new String[] { "novo@exemplo.com", "dono@exemplo.com" }) {
            cadastrar(email)
                    .andExpect(status().isAccepted())
                    .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                    .andExpect(content().string(""));
        }

        // uma vez para cada pedido, com ou sem conta
        verify(encoder, times(2)).encode(SENHA);
        assertThat(emailFalso.enviadas()).hasSize(2);
        assertThat(emailFalso.enviadas().stream().map(MensagemEmail::para).toList())
                .containsExactly("novo@exemplo.com", "dono@exemplo.com");
        assertThat(jdbc.queryForObject("select count(*) from usuario", Long.class)).isEqualTo(1);
    }
}
