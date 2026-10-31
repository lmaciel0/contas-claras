package dev.lmaciel.contasclaras.comum;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;

/**
 * Traduz exceções em respostas {@code {"erro": "..."}}. Estende {@link ResponseEntityExceptionHandler}
 * para que as exceções do próprio Spring MVC (415, 405, 404 de rota...) mantenham o status certo
 * e também saiam no formato {@link ApiErro}.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static final String REQUISICAO_INVALIDA = "Requisição inválida.";

    @ExceptionHandler(NaoEncontradoException.class)
    ResponseEntity<ApiErro> naoEncontrado(NaoEncontradoException e) {
        return resposta(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(ConflitoException.class)
    ResponseEntity<ApiErro> conflito(ConflitoException e) {
        return resposta(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(RequisicaoInvalidaException.class)
    ResponseEntity<ApiErro> requisicaoInvalida(RequisicaoInvalidaException e) {
        return resposta(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(NaoAutenticadoException.class)
    ResponseEntity<ApiErro> naoAutenticado(NaoAutenticadoException e) {
        return resposta(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(ProibidoException.class)
    ResponseEntity<ApiErro> proibido(ProibidoException e) {
        return resposta(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(MuitasTentativasException.class)
    ResponseEntity<ApiErro> muitasTentativas(MuitasTentativasException e) {
        return resposta(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(EmailIndisponivelException.class)
    ResponseEntity<ApiErro> emailIndisponivel(EmailIndisponivelException e) {
        return resposta(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiErro> violacao(ConstraintViolationException e) {
        String mensagem = e.getConstraintViolations().stream()
                .findFirst()
                .map(ConstraintViolation::getMessage)
                .orElse(REQUISICAO_INVALIDA);
        return resposta(HttpStatus.BAD_REQUEST, mensagem);
    }

    /**
     * Última rede: nada de stack trace no corpo. Exceções de segurança voltam para o filtro do Spring
     * Security, que responde 401/403 pelos handlers configurados.
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErro> inesperado(Exception e) throws Exception {
        if (e instanceof AccessDeniedException || e instanceof AuthenticationException) {
            throw e;
        }
        log.error("Erro não tratado", e);
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String mensagem = e.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(ObjectError::getDefaultMessage)
                .orElse(REQUISICAO_INVALIDA);
        return corpo(HttpStatus.BAD_REQUEST, mensagem);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException e,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String mensagem = e.getAllErrors().stream()
                .findFirst()
                .map(MessageSourceResolvable::getDefaultMessage)
                .orElse(REQUISICAO_INVALIDA);
        return corpo(HttpStatus.BAD_REQUEST, mensagem);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException e,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return corpo(HttpStatus.BAD_REQUEST, REQUISICAO_INVALIDA);
    }

    /** Demais exceções do Spring MVC: mantém status e headers (ex.: Allow, Accept), troca o corpo. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        if (status.is5xxServerError()) {
            log.error("Erro interno do framework", e);
        }
        return ResponseEntity.status(status).headers(headers).body(new ApiErro(mensagemPadrao(status)));
    }

    private static String mensagemPadrao(HttpStatusCode status) {
        return switch (status.value()) {
            case 404 -> "Não encontrado.";
            case 405 -> "Método não permitido.";
            case 406 -> "Formato de resposta não aceito.";
            case 415 -> "Tipo de conteúdo não suportado. Use application/json.";
            default -> status.is5xxServerError() ? "Erro interno." : REQUISICAO_INVALIDA;
        };
    }

    private static ResponseEntity<Object> corpo(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(new ApiErro(mensagem));
    }

    private static ResponseEntity<ApiErro> resposta(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(new ApiErro(mensagem));
    }
}
