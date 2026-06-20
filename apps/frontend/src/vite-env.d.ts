/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POKER_SERVER?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
