import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// resolve.tsconfigPaths resolves the "@/*" alias from tsconfig.json inside
// tests. Vite supports this natively, so the vite-tsconfig-paths plugin the
// Next 16.2.11 guide recommends is no longer needed.
// jsdom is the default environment so client components can be rendered;
// pure-logic tests run fine under it too.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
  },
})
