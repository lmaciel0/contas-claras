package dev.lmaciel.contasclaras.categoria;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import dev.lmaciel.contasclaras.usuario.Usuario;

/**
 * Categorias que todo usuário novo recebe, na ordem em que aparecem nas telas.
 */
@Component
public class CategoriasPadrao {

    private static final List<String> DESPESAS = List.of(
            "Doméstica", "Transporte", "Entretenimento", "Saúde", "Dívidas/Empréstimos",
            "Cartões de crédito", "Bancos", "Obrigações financeiras", "Pagamentos diversos", "Pessoais");

    private final CategoriaRepository categorias;

    public CategoriasPadrao(CategoriaRepository categorias) {
        this.categorias = categorias;
    }

    public void criarPara(Usuario usuario) {
        List<Categoria> novas = new ArrayList<>();
        novas.add(new Categoria(usuario, "Receitas", TipoCategoria.RECEITA, 0));
        for (int i = 0; i < DESPESAS.size(); i++) {
            novas.add(new Categoria(usuario, DESPESAS.get(i), TipoCategoria.DESPESA, i + 1));
        }
        categorias.saveAll(novas);
    }
}
