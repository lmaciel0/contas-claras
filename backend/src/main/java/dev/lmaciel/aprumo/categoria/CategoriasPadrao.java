package dev.lmaciel.aprumo.categoria;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import dev.lmaciel.aprumo.usuario.Usuario;

/**
 * Categorias que todo usuário novo recebe, na ordem em que aparecem nas telas.
 */
@Component
public class CategoriasPadrao {

    private record DefinicaoPadrao(String nome, String icone, String cor) {}

    private static final List<DefinicaoPadrao> DESPESAS = List.of(
            new DefinicaoPadrao("Doméstica", "casa", "#06b6d4"),
            new DefinicaoPadrao("Transporte", "transporte", "#3b82f6"),
            new DefinicaoPadrao("Entretenimento", "praia", "#f97316"),
            new DefinicaoPadrao("Saúde", "saude", "#84cc16"),
            new DefinicaoPadrao("Dívidas/Empréstimos", "servicos", "#b45309"),
            new DefinicaoPadrao("Cartões de crédito", "outros", "#f43f5e"),
            new DefinicaoPadrao("Bancos", "servicos", "#6366f1"),
            new DefinicaoPadrao("Obrigações financeiras", "servicos", "#059669"),
            new DefinicaoPadrao("Pagamentos diversos", "outros", "#64748b"),
            new DefinicaoPadrao("Pessoais", "outros", "#a855f7"));

    private final CategoriaRepository categorias;

    public CategoriasPadrao(CategoriaRepository categorias) {
        this.categorias = categorias;
    }

    public void criarPara(Usuario usuario) {
        List<Categoria> novas = new ArrayList<>();
        novas.add(new Categoria(usuario, "Receitas", TipoCategoria.RECEITA, 0, "salario", "#10b981"));
        for (int i = 0; i < DESPESAS.size(); i++) {
            DefinicaoPadrao def = DESPESAS.get(i);
            novas.add(new Categoria(usuario, def.nome(), TipoCategoria.DESPESA, i + 1, def.icone(), def.cor()));
        }
        categorias.saveAll(novas);
    }
}
