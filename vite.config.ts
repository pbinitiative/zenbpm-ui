import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import i18nTypesPlugin from './scripts/generate-i18n-types.mjs'

interface BuildMetadata {
  version: string
  commit: string
}

const runGit = (args: string[]): string | undefined => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined
  } catch {
    return undefined
  }
}

const getApiVersion = (): string => {
  try {
    const apiDefinition = readFileSync(path.resolve(__dirname, 'openapi/api.yaml'), 'utf8')
    const infoSection = apiDefinition.match(/^info:\s*$([\s\S]*?)(?=^\S)/m)?.[1]
    return infoSection?.match(/^\s+version:\s*["']?([^\s"'#]+)["']?/m)?.[1] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

const buildMetadata: BuildMetadata = {
  version: getApiVersion(),
  commit: process.env.VITE_BUILD_COMMIT?.trim() || runGit(['rev-parse', '--short=7', 'HEAD']) || 'unknown',
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(buildMetadata.version),
    __BUILD_COMMIT__: JSON.stringify(buildMetadata.commit),
  },
  plugins: [react(), i18nTypesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@base': path.resolve(__dirname, './src/base'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/system': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
