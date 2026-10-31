package dev.lmaciel.contasclaras.nota;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.lmaciel.contasclaras.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "nota")
public class Nota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private CategoriaNota categoria;

    @Column(nullable = false, length = 200)
    private String titulo;

    /** JSON do editor, guardado em {@code jsonb}; o texto do JSON passa direto, sem reconverter. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String conteudo;

    /** Texto simples do conteúdo, usado na busca e na prévia. */
    @Column(nullable = false)
    private String texto;

    @Column(nullable = false)
    private boolean fixada;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Nota() {
    }

    public Nota(Usuario usuario, CategoriaNota categoria, String titulo, String conteudo, String texto,
            Instant quando) {
        this.usuario = usuario;
        this.categoria = categoria;
        this.titulo = titulo;
        this.conteudo = conteudo;
        this.texto = texto;
        this.criadoEm = quando;
        this.atualizadoEm = quando;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getConteudo() {
        return conteudo;
    }

    public String getTexto() {
        return texto;
    }

    public CategoriaNota getCategoria() {
        return categoria;
    }

    public boolean isFixada() {
        return fixada;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    /** Substitui tudo: a última gravação vale. */
    public void editar(String titulo, String conteudoJson, String texto, CategoriaNota categoria, Instant quando) {
        this.titulo = titulo;
        this.conteudo = conteudoJson;
        this.texto = texto;
        this.categoria = categoria;
        this.atualizadoEm = quando;
    }

    public void fixar() {
        this.fixada = true;
    }

    public void desfixar() {
        this.fixada = false;
    }
}
