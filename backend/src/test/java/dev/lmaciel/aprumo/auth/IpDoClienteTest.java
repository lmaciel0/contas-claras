package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class IpDoClienteTest {

    private static final String SEGREDO = "segredo-falso-so-para-testes";
    private static final String REMOTO = "10.0.0.9";

    private final IpDoCliente comSegredo = new IpDoCliente(SEGREDO);
    private final IpDoCliente semSegredo = new IpDoCliente("");

    private static MockHttpServletRequest req(String xff, String origem) {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr(REMOTO);
        if (xff != null) {
            r.addHeader("X-Forwarded-For", xff);
        }
        if (origem != null) {
            r.addHeader("X-Aprumo-Origem", origem);
        }
        return r;
    }

    @Test
    void direto_usa_o_segundo_da_direita() {
        assertThat(comSegredo.de(req("203.0.113.1, 198.51.100.10, 192.0.2.1", null))).isEqualTo("198.51.100.10");
    }

    @Test
    void via_vercel_com_segredo_correto_usa_o_terceiro_da_direita() {
        assertThat(comSegredo.de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", SEGREDO)))
                .isEqualTo("198.51.100.10");
    }

    @Test
    void segredo_errado_vira_direto() {
        assertThat(comSegredo.de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", "outro")))
                .isEqualTo("198.51.100.99");
    }

    @Test
    void segredo_nao_configurado_com_cabecalho_enviado_vira_direto() {
        assertThat(semSegredo.de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", "")))
                .isEqualTo("198.51.100.99");
        assertThat(semSegredo.de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", SEGREDO)))
                .isEqualTo("198.51.100.99");
    }

    @Test
    void sem_xff_usa_o_remote_addr() {
        assertThat(comSegredo.de(req(null, null))).isEqualTo(REMOTO);
    }

    @Test
    void xff_so_com_virgulas_e_espacos_usa_o_remote_addr() {
        assertThat(comSegredo.de(req(",,  ,", null))).isEqualTo(REMOTO);
        assertThat(comSegredo.de(req(",,  ,", SEGREDO))).isEqualTo(REMOTO);
    }

    @Test
    void xff_curto_demais_usa_o_remote_addr() {
        assertThat(comSegredo.de(req("192.0.2.1", null))).isEqualTo(REMOTO);
        assertThat(comSegredo.de(req("198.51.100.10, 192.0.2.1", SEGREDO))).isEqualTo(REMOTO);
    }

    @Test
    void ipv6_vira_a_chave_do_prefixo_64() {
        assertThat(comSegredo.de(req("2001:db8::1, 192.0.2.1", null))).isEqualTo("2001:db8:0:0::/64");
    }

    @Test
    void ipv6_do_mesmo_64_cai_no_mesmo_balde() {
        String a = comSegredo.de(req("2001:db8:1:2:aaaa:bbbb:cccc:dddd, 192.0.2.1", null));
        String b = comSegredo.de(req("2001:DB8:1:2:1::9, 192.0.2.1", null));
        assertThat(a).isEqualTo("2001:db8:1:2::/64").isEqualTo(b);
    }

    @Test
    void ipv6_de_64_diferente_cai_em_baldes_diferentes() {
        String a = comSegredo.de(req("2001:db8:1:2::1, 192.0.2.1", null));
        String b = comSegredo.de(req("2001:db8:1:3::1, 192.0.2.1", null));
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void ipv6_mapeado_de_ipv4_vira_o_ipv4() {
        assertThat(comSegredo.de(req("::ffff:198.51.100.10, 192.0.2.1", null))).isEqualTo("198.51.100.10");
    }

    @Test
    void ipv4_com_octeto_fora_de_faixa_cai_no_remote_addr() {
        assertThat(comSegredo.de(req("256.1.1.1, 192.0.2.1", null))).isEqualTo(REMOTO);
        assertThat(comSegredo.de(req("1.2.3, 192.0.2.1", null))).isEqualTo(REMOTO);
        assertThat(comSegredo.de(req("1.2.3.4.5, 192.0.2.1", null))).isEqualTo(REMOTO);
    }

    @Test
    void lixo_que_so_parece_hexa_cai_no_remote_addr() {
        for (String lixo : new String[] {"deadbeef", ":::", "...", "aaaa", "1:2:3:4:5:6:7:8:9", "::g"}) {
            assertThat(comSegredo.de(req(lixo + ", 192.0.2.1", null))).as(lixo).isEqualTo(REMOTO);
        }
    }

    @Test
    void varias_linhas_de_xff_sao_juntas_e_o_forjado_na_primeira_nao_conta() {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr(REMOTO);
        r.addHeader("X-Forwarded-For", "forjado");
        r.addHeader("X-Forwarded-For", "198.51.100.10, 192.0.2.1");
        assertThat(comSegredo.de(r)).isEqualTo("198.51.100.10");
    }

    @Test
    void segredo_com_espacos_e_quebra_de_linha_em_volta_e_aparado() {
        IpDoCliente aparado = new IpDoCliente(" s3gr3d0\n");
        assertThat(aparado.de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", "s3gr3d0")))
                .isEqualTo("198.51.100.10");
    }

    @Test
    void segredo_nulo_ou_so_com_espacos_vira_direto_sem_erro() {
        assertThat(new IpDoCliente(null).de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", "")))
                .isEqualTo("198.51.100.99");
        assertThat(new IpDoCliente(" \n ").de(req("198.51.100.10, 198.51.100.99, 192.0.2.1", "")))
                .isEqualTo("198.51.100.99");
    }

    @Test
    void com_segredo_correto_e_xff_de_dois_itens_cai_no_remote_addr_sem_erro() {
        assertThat(comSegredo.de(req("198.51.100.10, 192.0.2.1", SEGREDO))).isEqualTo(REMOTO);
    }

    @Test
    void token_com_lixo_cai_no_remote_addr() {
        assertThat(comSegredo.de(req("<script>, 192.0.2.1", null))).isEqualTo(REMOTO);
        assertThat(comSegredo.de(req("a".repeat(46) + ", 192.0.2.1", null))).isEqualTo(REMOTO);
    }

    @Test
    void espacos_em_volta_dos_tokens_sao_descartados() {
        assertThat(comSegredo.de(req("  198.51.100.10 ,  192.0.2.1 ", null))).isEqualTo("198.51.100.10");
    }
}
