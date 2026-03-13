interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  readonly VITE_SOCKET_PATH?: string;
  readonly VITE_API_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
