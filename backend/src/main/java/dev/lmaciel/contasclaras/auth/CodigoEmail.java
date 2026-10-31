package dev.lmaciel.contasclaras.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Código de uso único enviado por e-mail (confirmar cadastro ou redefinir senha). Guarda só o HMAC do código
 * e o hash do token do link, nunca os valores em claro. Há no máximo uma linha por tipo e e-mail.
 * {@code nome} e {@code tokenHash} só existem no tipo {@link TipoCodigo#CADASTRO}. A pendência nunca guarda
 * senha: ela só é definida na confirmação, depois da prova de posse do e-mail.
 */
@Entity
@Table(name = "codigo_email")
public class CodigoEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoCodigo tipo;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(length = 120)
    private String nome;

    @Column(name = "codigo_hmac", nullable = false, length = 64)
    private String codigoHmac;

    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private int tentativas;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    /** Vem do {@code Clock} injetado, não do {@code default now()} do banco, para os testes com relógio fixo. */
    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected CodigoEmail() {
    }

    public CodigoEmail(TipoCodigo tipo, String email, String nome, String codigoHmac, String tokenHash,
            Instant criadoEm, Instant expiraEm) {
        this.tipo = tipo;
        this.email = email;
        this.nome = nome;
        this.codigoHmac = codigoHmac;
        this.tokenHash = tokenHash;
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }

    public Long getId() {
        return id;
    }

    public TipoCodigo getTipo() {
        return tipo;
    }

    public String getEmail() {
        return email;
    }

    public String getNome() {
        return nome;
    }

    public String getCodigoHmac() {
        return codigoHmac;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public int getTentativas() {
        return tentativas;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    /** Conta uma tentativa errada. Quem chama apaga a linha na quinta. */
    public void registrarTentativa() {
        tentativas++;
    }

    /** Novo pedido para o mesmo tipo e e-mail: troca código e token, zera as tentativas e renova o prazo. */
    public void substituir(String nome, String codigoHmac, String tokenHash, Instant criadoEm, Instant expiraEm) {
        this.nome = nome;
        this.codigoHmac = codigoHmac;
        this.tokenHash = tokenHash;
        this.tentativas = 0;
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }
}
