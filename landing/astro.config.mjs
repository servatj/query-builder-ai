import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://maisql.com',
  output: 'static',
  build: {
    assets: 'assets'
  },
  vite: {
    build: {
      assetsInlineLimit: 0
    }
  }
});
