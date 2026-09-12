import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: sandbox preview proxy reaches the dev server via a non-localhost
    // hostname. Safe to remove when running locally on your own machine.
    allowedHosts: true,
  },
})