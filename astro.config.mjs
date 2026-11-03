// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'https://example.com',
  base: process.env.ASTRO_BASE ?? '/',
  integrations: [preact()],
  build: { format: 'directory' },
  trailingSlash: 'always',
});
