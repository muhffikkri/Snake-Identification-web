/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Neon Postgres connection string, exposed to the browser via vite envPrefix. */
  readonly DATABASE_URL?: string;
  /** Neon Object Storage S3-compatible base URL. */
  readonly NEON_STORAGE_ENDPOINT?: string;
}
