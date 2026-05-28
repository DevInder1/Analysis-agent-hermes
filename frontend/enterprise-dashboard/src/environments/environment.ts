export const environment = {
  /** Proxied via proxy.conf.mjs during `ng serve` */
  hermesApiUrl: '/hermes-api',
  /** Prefer direct URL if /local-api proxy returns HTML; CORS is enabled on the API */
  localApiUrl: 'http://127.0.0.1:8002',
  hermesModel: 'hermes-agent',
  hermesApiKey: 'change-me-local-dev',
};
