# Timeout de Inatividade de 30 Minutos e Redução de Validade da Sessão: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encerrar a sessão e deslogar automaticamente após 30 minutos de inatividade no frontend (inclusive ao suspender/reabrir o notebook) e reduzir a validade do JWT de 30 dias para 24 horas no backend.

**Architecture:** Hook dedicado no frontend (`useTimeoutInatividade`) rastreia interações ativas (`pointerdown`, `keydown`, `scroll`, `touchstart`), sincroniza via `localStorage` entre abas, e ao retomar foco ou visibilidade da aba (`visibilitychange`, `focus`) confere o tempo inativo. Se >= 30 minutos, executa logout imediato, limpa os dados em cache e redireciona para a tela de login com aviso explicativo. No backend, `TokenService.VALIDADE` é reduzido de 30 dias para 24 horas como defesa em profundidade.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library; Spring Boot 4.1.2, Java 21, JUnit 5.

**Spec:** `docs/superpowers/specs/2026-11-02-timeout-inatividade-30m-design.md`

## Global Constraints

- Backend no pacote `dev.lmaciel.aprumo.auth`. Comentários, nomes e mensagens em PT-BR.
- Frontend em `frontend/src/auth/`. Uso estrito de TypeScript e Tailwind CSS existente sem adicionar bibliotecas externas.
- Testes TDD obrigatórios em todas as tarefas: teste que falha primeiro, depois código mínimo, depois teste passando e commit atômico.
- Nenhuma dependência externa nova (usar APIs nativas do navegador e da linguagem).
- Respeitar modo estrito e tipagem rigorosa (`tsc -b`).

## Review Focus

1. **Suspensão de notebook / congelamento de timers**: Timers JS (`setInterval`) congelam durante a suspensão. O teste deve cobrir especificamente o evento `visibilitychange` / `focus` simulando passagem do tempo (30+ min) para disparar a expiração instantânea.
2. **Sincronização entre múltiplas abas**: O uso ativo em uma aba atualiza `localStorage` e a aba secundária não deve ser deslogada se houver atividade recente na primária.
3. **Throttle de eventos de interação**: Interações frequentes (como rolagem contínua ou digitação) não devem sobrecarregar chamadas a `localStorage.setItem`; deve haver throttle de 5 segundos.
4. **Desconexão silenciosa na tela de login**: Se o usuário já estiver deslogado (`usuario === null`), nenhum temporizador de inatividade deve rodar ou causar redirecionamentos repetidos.
5. **Mensagem contextual no Login**: O usuário deslogado por inatividade deve ver a mensagem informativa *"Sua sessão expirou por inatividade (30 minutos)."* para entender o que aconteceu.

---

### Task 1: Redução da validade do JWT no Backend para 24 Horas

Agent: `java-spring`.

**Files:**
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/auth/TokenService.java`
- Create: `backend/src/test/java/dev/lmaciel/aprumo/auth/TokenServiceTest.java`

**Interfaces:**
- `TokenService.VALIDADE`: `Duration.ofHours(24)`
- `TokenService.emitir(long usuarioId, int sessaoVersao)`: expira em `Instant.now().plus(VALIDADE)`

- [ ] **Step 1: Write the failing test**

Criar `backend/src/test/java/dev/lmaciel/aprumo/auth/TokenServiceTest.java`:
```java
package dev.lmaciel.aprumo.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class TokenServiceTest {

    @Test
    void validadePadraoDoTokenDeveSerDe24Horas() {
        assertThat(TokenService.VALIDADE).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void emitirGeraTokenComExpiracaoEm24Horas() {
        Instant agora = Instant.parse("2026-11-02T10:00:00Z");
        Clock clock = Clock.fixed(agora, ZoneOffset.UTC);
        TokenService service = new TokenService("01234567890123456789012345678901", clock);

        String token = service.emitir(42L, 1);
        assertThat(token).isNotBlank();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Executar:
```bash
./mvnw test -Dtest=TokenServiceTest
```
Esperado: FAIL porque `TokenService.VALIDADE` atualmente é `Duration.ofDays(30)`.

- [ ] **Step 3: Write minimal implementation**

No arquivo `backend/src/main/java/dev/lmaciel/aprumo/auth/TokenService.java`, alterar a linha 29:
```java
public static final Duration VALIDADE = Duration.ofHours(24);
```

- [ ] **Step 4: Run test to verify it passes**

Executar:
```bash
./mvnw test -Dtest=TokenServiceTest
```
Esperado: PASS (2/2 testes passando).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/dev/lmaciel/aprumo/auth/TokenService.java backend/src/test/java/dev/lmaciel/aprumo/auth/TokenServiceTest.java
git commit -m "fix(auth): reduzir validade maxima da sessao jwt para 24 horas"
```

---

### Task 2: Hook de Inatividade no Frontend (`useTimeoutInatividade`)

Agent: `frontend-developer`.

**Files:**
- Create: `frontend/src/auth/useTimeoutInatividade.ts`
- Create: `frontend/src/auth/useTimeoutInatividade.test.ts`

**Interfaces:**
- Produces: `useTimeoutInatividade(opcoes: { ativo: boolean; timeoutMs?: number; aoExpirar: () => void })`
- Chave de storage: `aprumo-ultima-atividade`
- Padrão de timeout: `30 * 60 * 1000` (30 minutos)
- Throttle de escrita: 5.000 ms

- [ ] **Step 1: Write the failing tests**

Criar `frontend/src/auth/useTimeoutInatividade.test.ts`:
```tsx
import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_ULTIMA_ATIVIDADE, useTimeoutInatividade } from './useTimeoutInatividade'

describe('useTimeoutInatividade', () => {
  const TIMEOUT_PADRAO = 30 * 60 * 1000

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('nao faz nada quando inativo (usuario deslogado)', () => {
    const aoExpirar = vi.fn()
    renderHook(() => useTimeoutInatividade({ ativo: false, aoExpirar }))

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_PADRAO + 5000)
    })

    expect(aoExpirar).not.toHaveBeenCalled()
    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBeNull()
  })

  it('grava timestamp ao inicializar ativo e expira apos 30 minutos sem atividade', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBe(String(agora))

    // Passa 29 minutos: nao expira
    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000)
    })
    expect(aoExpirar).not.toHaveBeenCalled()

    // Passa mais 1 minuto e 15 segundos: expira
    act(() => {
      vi.advanceTimersByTime(1 * 60 * 1000 + 15000)
    })
    expect(aoExpirar).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBeNull()
  })

  it('interacao do usuario posterga a expiracao', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    // Passa 20 minutos
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000)
      window.dispatchEvent(new Event('pointerdown'))
    })

    // Passa mais 20 minutos (total 40 min desde inicio, mas apenas 20 min desde ultimo clique)
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000)
    })
    expect(aoExpirar).not.toHaveBeenCalled()

    // Passa mais 11 minutos (total 31 min desde ultimo clique)
    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000)
    })
    expect(aoExpirar).toHaveBeenCalledTimes(1)
  })

  it('ao retomar visibilidade apos suspensao (notebook fechado), expira imediatamente', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    // Notebook suspenso por 8 horas (timers JS nao rodaram enquanto desligado)
    vi.setSystemTime(agora + 8 * 60 * 60 * 1000)

    // Evento de volta da visibilidade da aba
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(aoExpirar).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Executar:
```bash
npm --prefix frontend test -- useTimeoutInatividade.test.ts
```
Esperado: FAIL ("Cannot find module './useTimeoutInatividade'").

- [ ] **Step 3: Write minimal implementation**

Criar `frontend/src/auth/useTimeoutInatividade.ts`:
```typescript
import { useEffect, useRef } from 'react'

export const CHAVE_ULTIMA_ATIVIDADE = 'aprumo-ultima-atividade'
export const TIMEOUT_INATIVIDADE_PADRAO_MS = 30 * 60 * 1000 // 30 minutos
const THROTTLE_ATIVIDADE_MS = 5_000 // Atualiza no maximo a cada 5s
const INTERVALO_CHECAGEM_MS = 15_000 // Verifica a cada 15s

interface OpcoesTimeoutInatividade {
  ativo: boolean
  timeoutMs?: number
  aoExpirar: () => void
}

export function useTimeoutInatividade({
  ativo,
  timeoutMs = TIMEOUT_INATIVIDADE_PADRAO_MS,
  aoExpirar,
}: OpcoesTimeoutInatividade) {
  const aoExpirarRef = useRef(aoExpirar)
  aoExpirarRef.current = aoExpirar

  const ultimaGravacaoRef = useRef<number>(0)

  useEffect(() => {
    if (!ativo) {
      return
    }

    const agora = Date.now()
    const salvo = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE))
    const timestampInicial = Number.isFinite(salvo) && salvo > 0 ? salvo : agora
    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(timestampInicial))
    ultimaGravacaoRef.current = agora

    const registrarAtividade = () => {
      const atual = Date.now()
      if (atual - ultimaGravacaoRef.current >= THROTTLE_ATIVIDADE_MS) {
        ultimaGravacaoRef.current = atual
        try {
          localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(atual))
        } catch {
          // localStorage indisponivel (quota/modo privado restrito)
        }
      }
    }

    const conferirExpiracao = () => {
      const atual = Date.now()
      const gravado = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE))
      const referencia = Number.isFinite(gravado) && gravado > 0 ? gravado : ultimaGravacaoRef.current

      if (atual - referencia >= timeoutMs) {
        try {
          localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE)
        } catch {
          // ignore
        }
        aoExpirarRef.current()
      }
    }

    // Conferir expiracao imediata ao montar
    conferirExpiracao()

    // Eventos de interacao do usuario
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach((evt) => window.addEventListener(evt, registrarAtividade, { passive: true }))

    // Retomada de foco / suspensao do computador
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        conferirExpiracao()
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('focus', conferirExpiracao)

    // Checagem periodica
    const temporizador = setInterval(conferirExpiracao, INTERVALO_CHECAGEM_MS)

    return () => {
      eventos.forEach((evt) => window.removeEventListener(evt, registrarAtividade))
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('focus', conferirExpiracao)
      clearInterval(temporizador)
    }
  }, [ativo, timeoutMs])
}
```

- [ ] **Step 4: Run test to verify it passes**

Executar:
```bash
npm --prefix frontend test -- useTimeoutInatividade.test.ts
```
Esperado: PASS (4/4 testes passando).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/useTimeoutInatividade.ts frontend/src/auth/useTimeoutInatividade.test.ts
git commit -m "feat(auth): adicionar hook de timeout por inatividade de 30 minutos"
```

---

### Task 3: Integrar Inatividade ao `AuthProvider` e Feedback na `LoginPage`

Agent: `frontend-developer`.

**Files:**
- Modify: `frontend/src/auth/AuthProvider.tsx`
- Modify: `frontend/src/auth/LoginPage.tsx`
- Modify: `frontend/src/auth/LoginPage.test.tsx`
- Modify: `frontend/src/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `useTimeoutInatividade` de `frontend/src/auth/useTimeoutInatividade.ts`
- Mensagem de sessão expirada na tela de login: *"Sua sessão expirou por inatividade (30 minutos)."*

- [ ] **Step 1: Write the failing tests**

Adicionar teste de sessão expirada em `frontend/src/auth/LoginPage.test.tsx`:
```tsx
it('exibe_aviso_quando_sessao_expirou_por_inatividade', () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { expirouInatividade: true } }]}>
      <LoginPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou por inatividade (30 minutos).')
})
```

- [ ] **Step 2: Run test to verify it fails**

Executar:
```bash
npm --prefix frontend test -- LoginPage.test.tsx
```
Esperado: FAIL ("Unable to find an element with the role 'alert'").

- [ ] **Step 3: Implement LoginPage and AuthProvider integration**

1. Em `frontend/src/auth/LoginPage.tsx`:
Adicionar leitura do estado de rota `expirouInatividade`:
```tsx
const location = useLocation()
const expirouInatividade = Boolean((location.state as { expirouInatividade?: boolean } | null)?.expirouInatividade)
```
E renderizar alerta acessível logo acima do formulário se `expirouInatividade`:
```tsx
{expirouInatividade && (
  <div role="alert" className="mb-4 rounded-xl border border-[var(--cor-alerta-borda,#f59e0b)] bg-[var(--cor-alerta-fundo,#fef3c7)] px-3 py-2 text-sm text-[var(--cor-alerta-texto,#92400e)] font-medium">
    Sua sessão expirou por inatividade (30 minutos).
  </div>
)}
```

2. Em `frontend/src/auth/AuthProvider.tsx`:
Conectar o hook `useTimeoutInatividade`:
```tsx
import { useTimeoutInatividade } from './useTimeoutInatividade'
import { useNavigate } from 'react-router'
```
Dentro de `AuthProvider`:
```tsx
useTimeoutInatividade({
  ativo: usuario !== null,
  aoExpirar: () => {
    void auth.sair()
    // Redireciona com estado avisando a expiracao
    window.location.assign('/login?motivo=inatividade')
  },
})
```
E no `LoginPage.tsx`, aceitar tanto `location.state?.expirouInatividade` quanto `new URLSearchParams(window.location.search).get('motivo') === 'inatividade'`.

- [ ] **Step 4: Run test to verify it passes**

Executar:
```bash
npm --prefix frontend test -- LoginPage.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/AuthProvider.tsx frontend/src/auth/LoginPage.tsx frontend/src/auth/LoginPage.test.tsx
git commit -m "feat(auth): conectar timeout de inatividade ao AuthProvider e exibir alerta no login"
```

---

### Task 4: Verificação Completa e Integração Final

Agent: `general-purpose`.

**Files:**
- N/A (Execução de validações e testes)

- [ ] **Step 1: Run frontend test suite & lint**

Executar:
```bash
npm --prefix frontend test
npm --prefix frontend run build
```
Esperado: Todos os testes passando (64+ arquivos, 0 falhas) e TypeScript compilando sem erros.

- [ ] **Step 2: Run backend test suite**

Executar:
```bash
./mvnw test
```
Esperado: BUILD SUCCESS, todos os testes unitários e de integração passando.

- [ ] **Step 3: Verification commit / check clean working directory**

```bash
git status
```
Esperado: Limpo, pronto para submissão e code review.
