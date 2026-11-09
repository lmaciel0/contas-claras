package dev.lmaciel.aprumo.metas;

import dev.lmaciel.aprumo.comum.RequisicaoInvalidaException;
import dev.lmaciel.aprumo.usuario.Usuario;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "metas")
public class Meta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "valor_alvo", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAlvo;

    @Column(name = "valor_guardado", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorGuardado;

    @Column(name = "mes_alvo")
    private Integer mesAlvo;

    @Column(name = "ano_alvo")
    private Integer anoAlvo;

    @Column(name = "preset_visual", nullable = false, length = 50)
    private String presetVisual = "padrao";

    @Column(name = "imagem_url", length = 500)
    private String imagemUrl;

    @Column(name = "cor_gradiente", length = 100)
    private String corGradiente;

    @Column(nullable = false)
    private int ordem = 0;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em")
    private Instant atualizadoEm;

    protected Meta() {
    }

    public Meta(Usuario usuario, String nome, BigDecimal valorAlvo, BigDecimal valorGuardado,
                Integer mesAlvo, Integer anoAlvo, String presetVisual, String imagemUrl,
                String corGradiente, int ordem) {
        this.usuario = usuario;
        this.nome = nome;
        this.valorAlvo = valorAlvo;
        this.valorGuardado = valorGuardado != null ? valorGuardado : BigDecimal.ZERO;
        this.mesAlvo = mesAlvo;
        this.anoAlvo = anoAlvo;
        this.presetVisual = presetVisual != null ? presetVisual : "padrao";
        this.imagemUrl = imagemUrl;
        this.corGradiente = corGradiente;
        this.ordem = ordem;
        this.atualizadoEm = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
        this.atualizadoEm = Instant.now();
    }

    public BigDecimal getValorAlvo() {
        return valorAlvo;
    }

    public void setValorAlvo(BigDecimal valorAlvo) {
        this.valorAlvo = valorAlvo;
        this.atualizadoEm = Instant.now();
    }

    public BigDecimal getValorGuardado() {
        return valorGuardado;
    }

    public void setValorGuardado(BigDecimal valorGuardado) {
        this.valorGuardado = valorGuardado;
        this.atualizadoEm = Instant.now();
    }

    public Integer getMesAlvo() {
        return mesAlvo;
    }

    public void setMesAlvo(Integer mesAlvo) {
        this.mesAlvo = mesAlvo;
        this.atualizadoEm = Instant.now();
    }

    public Integer getAnoAlvo() {
        return anoAlvo;
    }

    public void setAnoAlvo(Integer anoAlvo) {
        this.anoAlvo = anoAlvo;
        this.atualizadoEm = Instant.now();
    }

    public String getPresetVisual() {
        return presetVisual;
    }

    public void setPresetVisual(String presetVisual) {
        this.presetVisual = presetVisual;
        this.atualizadoEm = Instant.now();
    }

    public String getImagemUrl() {
        return imagemUrl;
    }

    public void setImagemUrl(String imagemUrl) {
        this.imagemUrl = imagemUrl;
        this.atualizadoEm = Instant.now();
    }

    public String getCorGradiente() {
        return corGradiente;
    }

    public void setCorGradiente(String corGradiente) {
        this.corGradiente = corGradiente;
        this.atualizadoEm = Instant.now();
    }

    public int getOrdem() {
        return ordem;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
        this.atualizadoEm = Instant.now();
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public void guardar(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RequisicaoInvalidaException("Valor a guardar deve ser positivo.");
        }
        this.valorGuardado = this.valorGuardado.add(valor);
        this.atualizadoEm = Instant.now();
    }

    public void resgatar(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RequisicaoInvalidaException("Valor a resgatar deve ser positivo.");
        }
        if (valor.compareTo(this.valorGuardado) > 0) {
            throw new RequisicaoInvalidaException("Valor a resgatar excede o saldo guardado.");
        }
        this.valorGuardado = this.valorGuardado.subtract(valor);
        this.atualizadoEm = Instant.now();
    }
}
