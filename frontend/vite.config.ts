import { copyFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteMockServe } from 'vite-plugin-mock'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  // 配置 GitHub Pages 的 base 路径
  base: command === 'build' ? '/kefu/' : '/',
  plugins: [
    vue(),
    // GitHub Pages 对不存在的路径返回 404.html；复制 index 后 SPA 深链可刷新
    ...(command === 'build'
      ? [
          {
            name: 'github-pages-spa-fallback',
            closeBundle() {
              const dist = resolve(__dirname, 'dist')
              copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
            },
          },
        ]
      : []),
    viteMockServe({
      mockPath: 'src/mock',
      // 我们现在使用前端拦截，其实可以禁用这里了，但保留开发环境也可以
      enable: command === 'serve',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
}))
