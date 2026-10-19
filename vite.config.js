import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// OTA용: 모든 JS/CSS를 하나의 index.html에 인라인해 단일 파일로 배포
// 빌드 결과(dist/index.html)는 npm run sync:www 가 www/game.html 로 옮긴다. www/index.html(OTA 로더)은 건드리지 않는다.
export default defineConfig({
  plugins: [viteSingleFile()],
  // 인게임에 표시되는 버전. package.json 의 version 하나만 고치면 된다.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
