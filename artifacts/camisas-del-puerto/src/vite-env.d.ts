/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed API, e.g. https://api.shirts.jcampos.dev */
  readonly VITE_API_URL?: string;
  /** Public base URL for uploaded assets, e.g. https://uploads.shirts.jcampos.dev */
  readonly VITE_UPLOADS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
