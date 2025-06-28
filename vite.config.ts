import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
  plugins: [sveltekit(), devtoolsJson()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/storage': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
});
