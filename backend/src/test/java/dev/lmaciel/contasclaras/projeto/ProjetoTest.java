package dev.lmaciel.contasclaras.projeto;

import dev.lmaciel.contasclaras.usuario.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Projeto - Regras de Domínio")
class ProjetoTest {

    private Usuario criarUsuarioMock() {
        return new Usuario("Lucas", "lucas@exemplo.com", "hash_senha", null);
    }

    @Test
    @DisplayName("Retorna 0% de progresso quando não há subtarefas e o estágio não é CONCLUIDO")
    void calculaProgressoZeroSemSubtarefasEEstagioAberto() {
        Usuario usuario = criarUsuarioMock();
        Projeto projeto = new Projeto(
                usuario,
                "Projeto Teste",
                "Descrição",
                "Financeiro",
                EstagioProjeto.A_FAZER,
                PrioridadeProjeto.MEDIA,
                CorProjeto.azul,
                0,
                LocalDate.now().plusDays(10)
        );

        assertEquals(0, projeto.calcularPorcentagemProgresso());
        assertEquals(0, projeto.getTotalSubtarefas());
        assertEquals(0, projeto.getSubtarefasConcluidas());
    }

    @Test
    @DisplayName("Retorna 100% de progresso quando não há subtarefas mas o estágio é CONCLUIDO")
    void calculaProgressoCemSemSubtarefasEEstagioConcluido() {
        Usuario usuario = criarUsuarioMock();
        Projeto projeto = new Projeto(
                usuario,
                "Projeto Finalizado",
                "Descrição",
                "Financeiro",
                EstagioProjeto.CONCLUIDO,
                PrioridadeProjeto.ALTA,
                CorProjeto.esmeralda,
                0,
                LocalDate.now()
        );

        assertEquals(100, projeto.calcularPorcentagemProgresso());
        assertEquals(0, projeto.getTotalSubtarefas());
        assertEquals(0, projeto.getSubtarefasConcluidas());
    }

    @Test
    @DisplayName("Calcula porcentagem proporcional arredondada com base nas subtarefas concluídas")
    void calculaProgressoProporcionalSubtarefas() {
        Usuario usuario = criarUsuarioMock();
        Projeto projeto = new Projeto(
                usuario,
                "Projeto com Subtarefas",
                "Descrição",
                "Produto",
                EstagioProjeto.EM_ANDAMENTO,
                PrioridadeProjeto.URGENTE,
                CorProjeto.indigo,
                0,
                LocalDate.now().plusDays(5)
        );

        projeto.adicionarSubtarefa("Subtarefa 1");
        projeto.adicionarSubtarefa("Subtarefa 2");
        projeto.adicionarSubtarefa("Subtarefa 3");

        assertEquals(3, projeto.getTotalSubtarefas());
        assertEquals(0, projeto.getSubtarefasConcluidas());
        assertEquals(0, projeto.calcularPorcentagemProgresso());

        // Conclui 1 de 3 -> 33%
        projeto.getSubtarefas().get(0).alternarConclusao();
        assertEquals(1, projeto.getSubtarefasConcluidas());
        assertEquals(33, projeto.calcularPorcentagemProgresso());

        // Conclui 2 de 3 -> 67%
        projeto.getSubtarefas().get(1).alternarConclusao();
        assertEquals(2, projeto.getSubtarefasConcluidas());
        assertEquals(67, projeto.calcularPorcentagemProgresso());

        // Conclui 3 de 3 -> 100%
        projeto.getSubtarefas().get(2).alternarConclusao();
        assertEquals(3, projeto.getSubtarefasConcluidas());
        assertEquals(100, projeto.calcularPorcentagemProgresso());
    }

    @Test
    @DisplayName("Permite atualizar estágio e ordem mantendo integridade")
    void atualizaEstagioEOrdem() {
        Usuario usuario = criarUsuarioMock();
        Projeto projeto = new Projeto(
                usuario,
                "Projeto Fluxo",
                "Descrição",
                "Geral",
                EstagioProjeto.A_FAZER,
                PrioridadeProjeto.BAIXA,
                CorProjeto.rosa,
                0,
                LocalDate.now()
        );

        projeto.moverPara(EstagioProjeto.EM_ANDAMENTO, 2);

        assertEquals(EstagioProjeto.EM_ANDAMENTO, projeto.getEstagio());
        assertEquals(2, projeto.getOrdem());
    }
}
