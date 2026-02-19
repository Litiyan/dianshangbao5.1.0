
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // 强制输出目录为 dist，配合 Cloudflare
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // 确保文件名纯净，不带任何 ?v=xxx 后缀，解决 Invalid loader 报错
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
