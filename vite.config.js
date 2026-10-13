import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// OTA용: 모든 JS/CSS를 하나의 index.html에 인라인해 단일 파일로 배포
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
