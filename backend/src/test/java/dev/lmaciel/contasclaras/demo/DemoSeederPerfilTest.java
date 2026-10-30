package dev.lmaciel.contasclaras.demo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import dev.lmaciel.contasclaras.IntegracaoTest;

/** Sem o profile {@code demo} (produção, dev, testes) o seed não existe: não há como ele rodar por engano. */
class DemoSeederPerfilTest extends IntegracaoTest {

    @Autowired
    ApplicationContext contexto;

    @Test
    void seed_so_existe_com_o_profile_demo() {
        assertThat(contexto.getBeanNamesForType(DemoSeeder.class)).isEmpty();
    }
}
