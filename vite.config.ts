import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split PDF.js into its own chunk for better caching
          'pdfjs-core': ['pdfjs-dist'],
          // Split React into its own chunk
          'react-vendor': ['react', 'react-dom']
        }
      }
    },
    // Increase chunk size warning limit since PDF.js worker is large
    chunkSizeWarningLimit: 1500
  }
});
