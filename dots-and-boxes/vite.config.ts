import { defineConfig } from 'vite';

// 静的ファイルとして公開できるよう、base は './' にしている。
export default defineConfig({
  base: './',
  build: { outDir: 'play', emptyOutDir: true },
});
