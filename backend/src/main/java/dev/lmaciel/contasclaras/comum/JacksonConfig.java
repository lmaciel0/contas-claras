package dev.lmaciel.contasclaras.comum;

import java.math.BigDecimal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * Dinheiro no JSON é sempre string decimal simples ("1234.56"), nunca número nem notação
 * científica. Na leitura, o Jackson já aceita string ou número para BigDecimal.
 */
@Configuration(proxyBeanMethods = false)
public class JacksonConfig {

    @Bean
    JacksonModule bigDecimalComoStringModule() {
        return new SimpleModule("bigDecimalComoString")
                .addSerializer(BigDecimal.class, new BigDecimalComoString());
    }

    static class BigDecimalComoString extends ValueSerializer<BigDecimal> {

        @Override
        public void serialize(BigDecimal valor, JsonGenerator gen, SerializationContext ctxt) {
            gen.writeString(valor.toPlainString());
        }
    }
}
