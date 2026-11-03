/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // "true" wlacza przycisk logowania na testera; patrz .env.example.
  readonly VITE_DEV_LOGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
