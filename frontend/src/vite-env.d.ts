/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ID de cliente OAuth do Google; vazio ou ausente desliga o botão "Continuar com Google". */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Parte usada da biblioteca Google Identity Services (https://accounts.google.com/gsi/client). */
interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (configuracao: { client_id: string; callback: (resposta: { credential: string }) => void }) => void
        renderButton: (elemento: HTMLElement, opcoes: Record<string, string | number>) => void
      }
    }
  }
}
