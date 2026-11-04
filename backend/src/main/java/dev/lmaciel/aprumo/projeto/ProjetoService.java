package dev.lmaciel.aprumo.projeto;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.comum.NaoEncontradoException;
import dev.lmaciel.aprumo.projeto.dto.*;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProjetoService {

    private final ProjetoRepository projetos;
    private final ProjetoSubtarefaRepository subtarefas;
    private final UsuarioRepository usuarios;

    public ProjetoService(ProjetoRepository projetos, ProjetoSubtarefaRepository subtarefas, UsuarioRepository usuarios) {
        this.projetos = projetos;
        this.subtarefas = subtarefas;
        this.usuarios = usuarios;
    }

    public List<ProjetoResposta> listar(UsuarioLogado usuario, String busca, PrioridadeProjeto prioridade) {
        List<Projeto> lista;
        if (busca != null && !busca.isBlank()) {
            lista = projetos.buscarPorTermo(usuario.id(), busca.trim());
        } else if (prioridade != null) {
            lista = projetos.findByUsuarioIdAndPrioridadeOrderByEstagioAscOrdemAsc(usuario.id(), prioridade);
        } else {
            lista = projetos.findByUsuarioIdOrderByEstagioAscOrdemAscCriadoEmDesc(usuario.id());
        }
        return lista.stream().map(ProjetoResposta::de).toList();
    }

    public ProjetoResposta obterPorId(long id, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(id, usuario.id());
        return ProjetoResposta.de(projeto);
    }

    @Transactional
    public ProjetoResposta criar(ProjetoCriacaoRequisicao req, UsuarioLogado usuarioLogado) {
        Usuario usuario = usuarios.findById(usuarioLogado.id())
                .orElseThrow(NaoEncontradoException::new);

        EstagioProjeto estagio = req.estagio() != null ? req.estagio() : EstagioProjeto.A_FAZER;
        int ordem = (int) projetos.countByUsuarioIdAndEstagio(usuario.getId(), estagio);

        Projeto projeto = new Projeto(
                usuario,
                req.titulo().trim(),
                req.descricao(),
                req.categoria(),
                estagio,
                req.prioridade(),
                req.cor(),
                ordem,
                req.prazo()
        );

        if (req.subtarefas() != null) {
            for (String sub : req.subtarefas()) {
                if (sub != null && !sub.isBlank()) {
                    projeto.adicionarSubtarefa(sub.trim());
                }
            }
        }

        return ProjetoResposta.de(projetos.save(projeto));
    }

    @Transactional
    public ProjetoResposta atualizar(long id, ProjetoEdicaoRequisicao req, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(id, usuario.id());
        projeto.atualizarDados(
                req.titulo().trim(),
                req.descricao(),
                req.categoria(),
                req.prioridade(),
                req.cor(),
                req.prazo()
        );
        return ProjetoResposta.de(projetos.save(projeto));
    }

    @Transactional
    public ProjetoResposta moverEstagio(long id, ProjetoMoverEstagioRequisicao req, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(id, usuario.id());
        EstagioProjeto estagioOrigem = projeto.getEstagio();
        EstagioProjeto estagioDestino = req.estagio();
        int novaOrdemDesejada = req.novaOrdem() != null ? req.novaOrdem() : 0;

        if (estagioOrigem == estagioDestino) {
            List<Projeto> coluna = new ArrayList<>(projetos.findByUsuarioIdAndEstagioOrderByOrdemAsc(usuario.id(), estagioDestino));
            coluna.removeIf(p -> p.getId().equals(projeto.getId()));
            int pos = Math.min(Math.max(0, novaOrdemDesejada), coluna.size());
            coluna.add(pos, projeto);
            for (int i = 0; i < coluna.size(); i++) {
                coluna.get(i).setOrdem(i);
            }
            projetos.saveAll(coluna);
        } else {
            // Remove da coluna de origem
            List<Projeto> colunaOrigem = new ArrayList<>(projetos.findByUsuarioIdAndEstagioOrderByOrdemAsc(usuario.id(), estagioOrigem));
            colunaOrigem.removeIf(p -> p.getId().equals(projeto.getId()));
            for (int i = 0; i < colunaOrigem.size(); i++) {
                colunaOrigem.get(i).setOrdem(i);
            }
            projetos.saveAll(colunaOrigem);

            // Insere na coluna de destino
            List<Projeto> colunaDestino = new ArrayList<>(projetos.findByUsuarioIdAndEstagioOrderByOrdemAsc(usuario.id(), estagioDestino));
            int pos = Math.min(Math.max(0, novaOrdemDesejada), colunaDestino.size());
            projeto.moverPara(estagioDestino, pos);
            colunaDestino.add(pos, projeto);
            for (int i = 0; i < colunaDestino.size(); i++) {
                colunaDestino.get(i).setOrdem(i);
            }
            projetos.saveAll(colunaDestino);
        }

        return ProjetoResposta.de(projeto);
    }

    @Transactional
    public void excluir(long id, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(id, usuario.id());
        projetos.delete(projeto);
    }

    @Transactional
    public SubtarefaResposta adicionarSubtarefa(long projetoId, SubtarefaCriacaoRequisicao req, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(projetoId, usuario.id());
        projeto.adicionarSubtarefa(req.titulo().trim());
        Projeto salvo = projetos.save(projeto);
        ProjetoSubtarefa criada = salvo.getSubtarefas().get(salvo.getSubtarefas().size() - 1);
        return SubtarefaResposta.de(criada);
    }

    @Transactional
    public SubtarefaResposta alternarSubtarefa(long projetoId, long subtarefaId, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(projetoId, usuario.id());
        ProjetoSubtarefa subtarefa = projeto.getSubtarefas().stream()
                .filter(s -> s.getId() != null && s.getId().equals(subtarefaId))
                .findFirst()
                .orElseThrow(NaoEncontradoException::new);

        subtarefa.alternarConclusao();
        projetos.save(projeto);
        return SubtarefaResposta.de(subtarefa);
    }

    @Transactional
    public void excluirSubtarefa(long projetoId, long subtarefaId, UsuarioLogado usuario) {
        Projeto projeto = buscarProjetoOu404(projetoId, usuario.id());
        boolean existia = projeto.getSubtarefas().stream()
                .anyMatch(s -> s.getId() != null && s.getId().equals(subtarefaId));
        if (!existia) {
            throw new NaoEncontradoException();
        }
        projeto.removerSubtarefa(subtarefaId);
        projetos.save(projeto);
    }

    private Projeto buscarProjetoOu404(long id, long usuarioId) {
        return projetos.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(NaoEncontradoException::new);
    }
}
