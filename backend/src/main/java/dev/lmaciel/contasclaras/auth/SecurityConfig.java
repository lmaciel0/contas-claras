package dev.lmaciel.contasclaras.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import dev.lmaciel.contasclaras.comum.NaoAutenticadoException;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;
import jakarta.servlet.http.Cookie;

/**
 * Sessão por cookie HttpOnly com JWT HS256, validado pelo resource server do Spring Security.
 * Toda rota exige sessão, exceto as públicas abaixo.
 */
@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

    private static final String CORPO_NAO_AUTENTICADO = "{\"erro\":\"" + NaoAutenticadoException.MENSAGEM + "\"}";

    // Só com servidor web: o comando de importação (profile "importar") roda sem web e não tem HttpSecurity.
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    SecurityFilterChain filtros(HttpSecurity http, JwtDecoder jwtDecoder) {
        RequestMatcher publicas = rotasPublicas();
        AuthenticationEntryPoint naoAutenticado = naoAutenticado();

        http
                // CSRF desligado de propósito: o cookie é SameSite=Strict (o navegador não o envia em
                // requisições vindas de outro site) e os endpoints de escrita só aceitam application/json.
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(publicas).permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(naoAutenticado))
                .oauth2ResourceServer(o -> o
                        .bearerTokenResolver(resolverDoCookie(publicas))
                        .authenticationEntryPoint(naoAutenticado)
                        .jwt(jwt -> jwt.decoder(jwtDecoder)));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${app.jwt.secret}") String segredo, Clock clock, UsuarioRepository usuarios) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(TokenService.chave(segredo))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        // A expiração é conferida com o Clock da aplicação, o mesmo que emite o token.
        JwtTimestampValidator validadorDeTempo = new JwtTimestampValidator();
        validadorDeTempo.setClock(clock);
        validadorDeTempo.setAllowEmptyExpiryClaim(false);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                validadorDeTempo, new SessaoVersaoValidator(usuarios)));
        return decoder;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static RequestMatcher rotasPublicas() {
        PathPatternRequestMatcher.Builder rota = PathPatternRequestMatcher.withDefaults();
        return new OrRequestMatcher(
                rota.matcher("/api/health"),
                rota.matcher("/api/auth/login"),
                rota.matcher("/api/auth/cadastro"),
                rota.matcher("/api/auth/google"));
    }

    /**
     * Lê o token só do cookie {@code cc_session} (nunca do header Authorization). Nas rotas públicas
     * ignora o cookie, para que uma sessão vencida não impeça de entrar de novo.
     */
    private static BearerTokenResolver resolverDoCookie(RequestMatcher publicas) {
        return request -> {
            if (publicas.matches(request)) {
                return null;
            }
            Cookie cookie = WebUtils.getCookie(request, SessaoCookie.NOME);
            return cookie != null && StringUtils.hasText(cookie.getValue()) ? cookie.getValue() : null;
        };
    }

    private static AuthenticationEntryPoint naoAutenticado() {
        return (request, response, excecao) -> {
            response.setStatus(401);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(CORPO_NAO_AUTENTICADO);
        };
    }
}
