interface ImportMetaEnv {
  readonly VITE_SHARE_ORIGIN?: string;
  readonly VITE_ONLINE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
