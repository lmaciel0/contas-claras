package dev.lmaciel.aprumo.metas;

import dev.lmaciel.aprumo.auth.UsuarioLogado;
import dev.lmaciel.aprumo.comum.NaoEncontradoException;
import dev.lmaciel.aprumo.metas.dto.*;
import dev.lmaciel.aprumo.resumo.ResumoService;
import dev.lmaciel.aprumo.resumo.dto.ResumoMes;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MetaService {

    private final MetaRepository metas;
    private final UsuarioRepository usuarios;
    private final ResumoService resumoService;
    private final Clock clock;

    public MetaService(MetaRepository metas, UsuarioRepository usuarios, ResumoService resumoService, Clock clock) {
        this.metas = metas;
        this.usuarios = usuarios;
        this.resumoService = resumoService;
        this.clock = clock;
    }

    public List<MetaResponse> listar(UsuarioLogado usuario) {
        LocalDate hoje = LocalDate.now(clock);
        return metas.findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(usuario.id())
                .stream()
                .map(m -> MetaResponse.de(m, hoje))
                .toList();
    }

    public MetaResponse obterPorId(long id, UsuarioLogado usuario) {
        LocalDate hoje = LocalDate.now(clock);
        Meta meta = buscarMetaOu404(id, usuario.id());
        return MetaResponse.de(meta, hoje);
    }

    @Transactional
    public MetaResponse criar(MetaRequest req, UsuarioLogado usuarioLogado) {
        Usuario usuario = usuarios.findById(usuarioLogado.id())
                .orElseThrow(NaoEncontradoException::new);

        int ordem = req.ordem() != null ? req.ordem() : 0;
        BigDecimal guardado = req.valorGuardado() != null ? req.valorGuardado() : BigDecimal.ZERO;

        Meta meta = new Meta(
                usuario,
                req.nome().trim(),
                req.valorAlvo(),
                guardado,
                req.mesAlvo(),
                req.anoAlvo(),
                req.presetVisual(),
                req.imagemUrl(),
                req.corGradiente(),
                ordem
        );

        Meta salva = metas.save(meta);
        return MetaResponse.de(salva, LocalDate.now(clock));
    }

    @Transactional
    public MetaResponse atualizar(long id, MetaRequest req, UsuarioLogado usuarioLogado) {
        Meta meta = buscarMetaOu404(id, usuarioLogado.id());

        meta.setNome(req.nome().trim());
        meta.setValorAlvo(req.valorAlvo());
        if (req.valorGuardado() != null) {
            meta.setValorGuardado(req.valorGuardado());
        }
        meta.setMesAlvo(req.mesAlvo());
        meta.setAnoAlvo(req.anoAlvo());
        if (req.presetVisual() != null) {
            meta.setPresetVisual(req.presetVisual());
        }
        meta.setImagemUrl(req.imagemUrl());
        meta.setCorGradiente(req.corGradiente());
        if (req.ordem() != null) {
            meta.setOrdem(req.ordem());
        }

        return MetaResponse.de(meta, LocalDate.now(clock));
    }

    @Transactional
    public MetaResponse guardar(long id, AporteMetaRequest req, UsuarioLogado usuarioLogado) {
        Meta meta = buscarMetaOu404(id, usuarioLogado.id());
        meta.guardar(req.valor());
        return MetaResponse.de(meta, LocalDate.now(clock));
    }

    @Transactional
    public MetaResponse resgatar(long id, AporteMetaRequest req, UsuarioLogado usuarioLogado) {
        Meta meta = buscarMetaOu404(id, usuarioLogado.id());
        meta.resgatar(req.valor());
        return MetaResponse.de(meta, LocalDate.now(clock));
    }

    @Transactional
    public void excluir(long id, UsuarioLogado usuarioLogado) {
        Meta meta = buscarMetaOu404(id, usuarioLogado.id());
        metas.delete(meta);
    }

    public ResumoConselheiroResponse obterConselheiro(int ano, int mes, UsuarioLogado usuarioLogado) {
        LocalDate hoje = LocalDate.now(clock);
        List<Meta> lista = metas.findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(usuarioLogado.id());

        ResumoMes resumo = resumoService.resumo(ano, mes, usuarioLogado);
        BigDecimal sobra = resumo.sobra() != null ? resumo.sobra() : BigDecimal.ZERO;

        BigDecimal totalGuardado = BigDecimal.ZERO;
        BigDecimal totalAlvo = BigDecimal.ZERO;
        List<SugestaoAporte> sugestoes = new ArrayList<>();

        for (Meta meta : lista) {
            totalGuardado = totalGuardado.add(meta.getValorGuardado());
            totalAlvo = totalAlvo.add(meta.getValorAlvo());

            MetaResponse resp = MetaResponse.de(meta, hoje);
            if (!resp.concluida() && resp.mesesRestantes() != null && resp.mesesRestantes() > 0) {
                BigDecimal mensal = new BigDecimal(resp.valorMensalSugerido());
                if (mensal.compareTo(BigDecimal.ZERO) > 0) {
                    sugestoes.add(new SugestaoAporte(meta.getId(), meta.getNome(), resp.valorMensalSugerido(), resp.mesesRestantes()));
                }
            }
        }

        String texto;
        if (sobra.compareTo(BigDecimal.ZERO) > 0) {
            String sobraFormatada = "R$ " + sobra.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
            if (!sugestoes.isEmpty()) {
                texto = String.format("Sua sobra prevista em %02d/%d é de %s. Que tal destinar parte para suas metas?", mes, ano, sobraFormatada);
            } else {
                texto = String.format("Sua sobra prevista em %02d/%d é de %s. Parabéns, você não tem metas pendentes no momento!", mes, ano, sobraFormatada);
            }
        } else {
            texto = String.format("Atenção: não há sobra prevista para %02d/%d. O foco neste mês é manter as despesas no limite.", mes, ano);
        }

        return new ResumoConselheiroResponse(
                sobra.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                lista.size(),
                totalGuardado.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                totalAlvo.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                texto,
                sugestoes
        );
    }

    private Meta buscarMetaOu404(long id, long usuarioId) {
        return metas.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(NaoEncontradoException::new);
    }
}
