import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const SERVER = 'http://127.0.0.1:5799';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': SERVER,
      '/media': SERVER,
    },
  },
});
