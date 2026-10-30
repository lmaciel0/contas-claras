# Contas Claras — front

React 19 + TypeScript + Vite, Tailwind v4, React Router, TanStack Query, Recharts.

```bash
npm install
npm run dev        # http://localhost:5173, /api vai para http://localhost:8080 (proxy)
npm test -- --run  # Vitest + Testing Library + MSW
npm run build      # tsc estrito + vite build
npm run lint       # oxlint
```

Em produção (Vercel Services), o `vercel.json` da raiz do repo define dois serviços no mesmo domínio: `web` (este
front, estático) e `api` (container do `backend/`). `/api/*` vai para o `api` e o resto para o `web`, então o cookie
de sessão é de primeira parte. Variável de ambiente do front: `VITE_GOOGLE_CLIENT_ID` (login com Google).
