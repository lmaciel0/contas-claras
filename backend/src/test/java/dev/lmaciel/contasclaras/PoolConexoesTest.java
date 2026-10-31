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
}
