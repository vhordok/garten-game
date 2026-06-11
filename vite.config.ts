import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// BASE_PATH wird vom GitHub-Pages-Workflow gesetzt (z. B. /garten-game/);
// lokal bleibt alles unter der Wurzel erreichbar.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
})
