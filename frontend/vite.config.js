import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escucha en localhost, tu IP de red Wi-Fi e IP de Radmin VPN
    port: 5173,
  },
});