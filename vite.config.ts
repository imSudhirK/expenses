import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Firebase Auth + Firestore SDKs are ~230 KB gzipped; that is expected.
  build: { chunkSizeWarningLimit: 1000 },
})
