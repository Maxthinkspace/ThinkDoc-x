import { build } from 'esbuild'

const isDev = process.env.NODE_ENV === 'development'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: isDev,
  minify: !isDev,
  keepNames: true,
  external: ['pg-native'],
  banner: {
    js: `#!/usr/bin/env node
// Office Add-in Backend API Server - Built with esbuild`,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})

console.log('✅ Build complete with esbuild')