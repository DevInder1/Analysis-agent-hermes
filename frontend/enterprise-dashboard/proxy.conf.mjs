/**
 * Dev-server proxy (Angular/Vite).
 * Array form avoids edge cases with multiple `/**` entries in proxy.conf.json.
 */
export default [
  {
    context: ['/hermes-api', '/hermes-api/**'],
    target: 'http://127.0.0.1:8642',
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/hermes-api': '' },
  },
  {
    context: ['/local-api', '/local-api/**'],
    target: 'http://127.0.0.1:8002',
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/local-api': '' },
  },
];
