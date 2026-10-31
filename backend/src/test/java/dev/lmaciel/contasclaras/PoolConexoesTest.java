package dev.lmaciel.contasclaras;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.zaxxer.hikari.HikariDataSource;

class PoolConexoesTest extends IntegracaoTest {

    @Autowired
    HikariDataSource dataSource;

    @Test
    void cada_instancia_abre_no_maximo_duas_conexoes() {
        assertThat(dataSource.getMaximumPoolSize()).isEqualTo(2);
        assertThat(dataSource.getMinimumIdle()).isZero();
    }

    /** Sem isso a conexão ociosa dura 10 min e 8 instâncias passam das 15 conexões do pooler. */
    @Test
    void conexao_ociosa_e_devolvida_em_10_segundos() {
        assertThat(dataSource.getIdleTimeout()).isEqualTo(10_000);
    }
}
