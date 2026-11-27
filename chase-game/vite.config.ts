import { defineConfig } from 'vite';

// 公開用(GitHub Pages)にビルド結果を play/ へ出力する。コミットして公開する。
// base を './' にして、/chase-game/play/ のようなサブフォルダ配下でも動くようにしている。
export default defineConfig({
  base: './',
  build: { outDir: 'play', emptyOutDir: true },
});
