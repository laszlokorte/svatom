import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
