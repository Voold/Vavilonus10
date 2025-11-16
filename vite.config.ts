// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      host: 'dev.vavilonus10.ru', 

      protocol: 'wss',
    },

    host: true,

    allowedHosts: [
      'resonantly-foremost-platypus.cloudpub.ru',
      'dev.vavilonus10.ru', 
    ],
  },
});