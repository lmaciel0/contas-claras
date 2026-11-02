package dev.lmaciel.contasclaras.categoria;

import dev.lmaciel.contasclaras.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "categoria")
public class Categoria {

    public static final String ICONE_PADRAO = "outros";
    public static final String COR_PADRAO = "#7d7a99";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 80)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoCategoria tipo;

    @Column(nullable = false)
    private int ordem;

    @Column(nullable = false, length = 50)
    private String icone;

    @Column(nullable = false, length = 30)
    private String cor;

    protected Categoria() {
    }

    public Categoria(Usuario usuario, String nome, TipoCategoria tipo, int ordem) {
        this(usuario, nome, tipo, ordem, ICONE_PADRAO, COR_PADRAO);
    }

    public Categoria(Usuario usuario, String nome, TipoCategoria tipo, int ordem, String icone, String cor) {
        this.usuario = usuario;
        this.nome = nome;
        this.tipo = tipo;
        this.ordem = ordem;
        this.icone = normalizarIcone(icone);
        this.cor = normalizarCor(cor);
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

    public TipoCategoria getTipo() {
        return tipo;
    }

    public int getOrdem() {
        return ordem;
    }

    public String getIcone() {
        return icone;
    }

    public String getCor() {
        return cor;
    }

    public void renomear(String nome) {
        this.nome = nome;
    }

    public void moverPara(int ordem) {
        this.ordem = ordem;
    }

    public void atualizar(String nome, String icone, String cor) {
        this.nome = nome;
        if (icone != null && !icone.isBlank()) {
            this.icone = icone.trim();
        }
        if (cor != null && !cor.isBlank()) {
            this.cor = cor.trim();
        }
    }

    private static String normalizarIcone(String icone) {
        return (icone == null || icone.isBlank()) ? ICONE_PADRAO : icone.trim();
    }

    private static String normalizarCor(String cor) {
        return (cor == null || cor.isBlank()) ? COR_PADRAO : cor.trim();
    }
}
