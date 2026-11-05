package dev.lmaciel.aprumo.auth;

import org.springframework.stereotype.Component;

import jakarta.servlet.ServletRequestEvent;
import jakarta.servlet.ServletRequestListener;
import jakarta.servlet.http.HttpServletRequest;

// TEMPORARIO DIAG-IP: remover na Task 2
/**
 * Guarda os cabeçalhos X-Forwarded-* brutos num atributo da requisição para o log de diagnóstico do
 * {@link AuthController}. Listener (e não filtro) porque o ForwardedHeaderFilter do Boot é adicionado direto
 * ao contexto do servlet, antes de qualquer filtro de bean, e removeria os cabeçalhos antes de um filtro vê-los.
 * O listener roda antes de toda a cadeia de filtros.
 */
@Component
public class DiagIpListener implements ServletRequestListener {

    // TEMPORARIO DIAG-IP: remover na Task 2
    static final String ATRIBUTO = "DIAG_IP_CABECALHOS";

    @Override
    public void requestInitialized(ServletRequestEvent evento) {
        if (evento.getServletRequest() instanceof HttpServletRequest req) {
            req.setAttribute(ATRIBUTO, "xff=" + req.getHeader("X-Forwarded-For")
                    + " proto=" + req.getHeader("X-Forwarded-Proto")
                    + " host=" + req.getHeader("X-Forwarded-Host"));
        }
    }
}
