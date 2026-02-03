import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages配信用（リポジトリ名に依存しないよう相対パスにする）
  base: './',
})
