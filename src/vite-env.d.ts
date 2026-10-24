/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Public key (`sb_publishable_...`); called "anon key" in older projects. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Set to `memory` to force the offline demo even if Supabase is configured. */
  readonly VITE_DATA_MODE?: 'memory' | 'supabase'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
