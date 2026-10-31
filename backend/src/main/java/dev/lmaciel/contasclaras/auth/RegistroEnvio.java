package dev.lmaciel.contasclaras.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Um envio de e-mail reservado, para os limites por e-mail, por IP e global. Guarda só HMAC do e-mail e do IP,
 * nunca os valores em claro.
 */
@Entity
@Table(name = "envio_email")
public class RegistroEnvio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_hmac", nullable = false, length = 64)
    private String emailHmac;

    @Column(name = "ip_hmac", nullable = false, length = 64)
    private String ipHmac;

    /** Vem do {@code Clock} injetado, não do {@code default now()} do banco, para os testes com relógio fixo. */
    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected RegistroEnvio() {
    }

    public RegistroEnvio(String emailHmac, String ipHmac, Instant criadoEm) {
        this.emailHmac = emailHmac;
        this.ipHmac = ipHmac;
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public String getEmailHmac() {
        return emailHmac;
    }

    public String getIpHmac() {
        return ipHmac;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
