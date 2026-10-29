package dev.lmaciel.contasclaras;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

class SchemaTest extends IntegracaoTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flyway_cria_tabelas() {
        List<String> tabelas = jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'", String.class);

        assertThat(tabelas).contains("usuario", "categoria", "item", "lancamento");
    }

    @Test
    void lancamento_rejeita_valor_zero() {
        Long usuarioId = jdbc.queryForObject(
                "insert into usuario (nome, email) values ('Fulano de Teste', 'fulano@exemplo.invalid') returning id",
                Long.class);
        Long categoriaId = jdbc.queryForObject(
                "insert into categoria (usuario_id, nome, tipo, ordem) values (?, 'Moradia', 'DESPESA', 1) returning id",
                Long.class, usuarioId);
        Long itemId = jdbc.queryForObject(
                "insert into item (categoria_id, nome) values (?, 'Aluguel') returning id", Long.class, categoriaId);

        try {
            assertThatThrownBy(() -> jdbc.update(
                    "insert into lancamento (item_id, ano, mes, valor, status) values (?, 2026, 10, 0, 'PREVISTO')",
                    itemId))
                    .isInstanceOf(DataIntegrityViolationException.class);
        } finally {
            jdbc.update("delete from usuario where id = ?", usuarioId);
        }
    }
}
