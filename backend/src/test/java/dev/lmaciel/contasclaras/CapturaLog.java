package dev.lmaciel.contasclaras;

import java.util.List;

import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

/**
 * Captura os eventos de um logger durante o teste e os tira do console (additive=false), para o teste
 * poder afirmar que o log saiu sem sujar a saída do build. Use em try-with-resources.
 */
public final class CapturaLog implements AutoCloseable {

    private final Logger logger;
    private final boolean aditivoOriginal;
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    private CapturaLog(Logger logger) {
        this.logger = logger;
        this.aditivoOriginal = logger.isAdditive();
        appender.start();
        logger.addAppender(appender);
        logger.setAdditive(false);
    }

    public static CapturaLog de(Class<?> classe) {
        return new CapturaLog((Logger) LoggerFactory.getLogger(classe));
    }

    public static CapturaLog de(String nomeDoLogger) {
        return new CapturaLog((Logger) LoggerFactory.getLogger(nomeDoLogger));
    }

    public List<ILoggingEvent> eventos() {
        return List.copyOf(appender.list);
    }

    @Override
    public void close() {
        logger.detachAppender(appender);
        logger.setAdditive(aditivoOriginal);
        appender.stop();
    }
}
