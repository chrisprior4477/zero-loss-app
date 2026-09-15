import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// resolve.tsconfigPaths resolves the "@/*" alias from tsconfig.json inside
// tests. Vite supports this natively, so the vite-tsconfig-paths plugin the
// Next 16.2.11 guide recommends is no longer needed.
// jsdom is the default environment so client components can be rendered;
// pure-logic tests run fine under it too.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // Unit tests mock the server client. Next itself enforces this boundary
    // during the application build; don't execute its marker in jsdom.
    alias: { 'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
  },
})
