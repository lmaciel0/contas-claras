package dev.lmaciel.contasclaras.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** A conta demo tem senha pública: só pode nascer em banco local, ou com a autorização explícita. */
class GuardaBancoDemoTest {

    private static final String URL_REMOTA = "jdbc:postgresql://db.exemplo.com:5432/x";

    @ParameterizedTest
    @ValueSource(strings = {
            "jdbc:postgresql://localhost:5432/contasclaras",
            "jdbc:postgresql://LOCALHOST/contasclaras",
            "jdbc:postgresql://127.0.0.1:5432/contasclaras?sslmode=disable",
            "jdbc:postgresql://[::1]:5432/contasclaras",
            "jdbc:postgresql://usuario:senha@localhost:5432/contasclaras",
            "jdbc:postgresql://localhost,127.0.0.1:5432/contasclaras"})
    void hosts_locais_sao_aceitos(String url) {
        assertThat(GuardaBancoDemo.local(url)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            URL_REMOTA,
            "jdbc:postgresql://db.exemplo.com/x",
            "jdbc:postgresql://10.0.0.5:5432/x",
            "jdbc:postgresql://[2001:db8::1]:5432/x",
            // O host de verdade vem depois do @: o localhost é só o usuário.
            "jdbc:postgresql://localhost@db.exemplo.com:5432/x",
            // Basta um host remoto na lista.
            "jdbc:postgresql://localhost,db.exemplo.com:5432/x",
            "jdbc:postgresql://localhost.exemplo.com:5432/x",
            "jdbc:postgresql://127.0.0.10:5432/x",
            // Sem host explícito ou fora do formato esperado: na dúvida, não é local.
            "jdbc:postgresql:x",
            "jdbc:postgresql:///x",
            "isto-nao-e-uma-url"})
    @NullAndEmptySource
    void hosts_remotos_ou_ilegiveis_nao_sao_locais(String url) {
        assertThat(GuardaBancoDemo.local(url)).isFalse();
    }

    @Test
    void banco_remoto_sem_autorizacao_recusa_com_mensagem_clara() {
        assertThatThrownBy(() -> GuardaBancoDemo.exigir(URL_REMOTA, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("db.exemplo.com")
                .hasMessageContaining("app.demo.permitir=true");
    }

    @Test
    void mensagem_de_recusa_nao_vaza_usuario_nem_senha_da_url() {
        assertThatThrownBy(() -> GuardaBancoDemo.exigir("jdbc:postgresql://admin:segredo@db.exemplo.com/x", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("segredo")
                .hasMessageNotContaining("admin");
    }

    @Test
    void banco_remoto_com_autorizacao_explicita_passa() {
        assertThatCode(() -> GuardaBancoDemo.exigir(URL_REMOTA, true)).doesNotThrowAnyException();
    }

    @Test
    void banco_local_passa_sem_autorizacao() {
        assertThatCode(() -> GuardaBancoDemo.exigir("jdbc:postgresql://localhost:5432/contasclaras", false))
                .doesNotThrowAnyException();
    }
}
