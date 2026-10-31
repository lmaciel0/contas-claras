package dev.lmaciel.contasclaras;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

/**
 * Lê os YAMLs crus, sem resolver placeholders, para provar onde existe valor padrão: produção não pode cair
 * em localhost sem ninguém perceber.
 */
class ConfigPadraoTest {

    private static Properties carregar(String arquivo) {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource(arquivo));
        return yaml.getObject();
    }

    @Test
    void app_url_nao_tem_valor_padrao_em_producao() {
        assertThat(carregar("application.yml").getProperty("app.url")).isEqualTo("${APP_URL}");
    }

    @Test
    void app_url_tem_padrao_local_so_no_perfil_dev() {
        assertThat(carregar("application-dev.yml").getProperty("app.url"))
                .isEqualTo("${APP_URL:http://localhost:5173}");
    }
}
