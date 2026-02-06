import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  treeshake: true,
  minify: process.env.NODE_ENV === 'production',
  clean: true,
  sourcemap: process.env.NODE_ENV !== 'production',
  splitting: true,
  dts: true,
  outDir: 'dist',
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  banner: {
    js: `#!/usr/bin/env node
// Office Add-in Backend API Server
// Built with tsdown - Modern TypeScript bundler`,
  }
})