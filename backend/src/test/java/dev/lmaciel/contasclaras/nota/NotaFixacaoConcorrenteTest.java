package dev.lmaciel.contasclaras.nota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.servlet.http.Cookie;

class NotaFixacaoConcorrenteTest extends NotaTestSupport {

    private static final int RODADAS = 15;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private Callable<Integer> fixarNaLargada(Cookie sessao, long id, CyclicBarrier largada) {
        return () -> {
            largada.await();
            var resposta = mvc.perform(patch(URL + "/" + id + "/fixada").cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"fixada\":true}"))
                    .andReturn().getResponse();
            if (resposta.getStatus() == 409) {
                assertThat(resposta.getContentAsString())
                        .contains("Outra nota foi fixada ao mesmo tempo. Tente de novo.");
            }
            return resposta.getStatus();
        };
    }

    @Test
    void fixacaoSimultaneaNaoDeixaDuasFixadas() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int i = 0; i < RODADAS; i++) {
                jdbc.update("update nota set fixada = false");
                long a = criarNota(sessao, null);
                long b = criarNota(sessao, null);
                CyclicBarrier largada = new CyclicBarrier(2);
                List<Future<Integer>> respostas = new ArrayList<>();
                respostas.add(pool.submit(fixarNaLargada(sessao, a, largada)));
                respostas.add(pool.submit(fixarNaLargada(sessao, b, largada)));

                for (Future<Integer> f : respostas) {
                    assertThat(f.get()).isIn(200, 409);
                }
                assertThat(contarFixadas()).isLessThanOrEqualTo(1);
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
