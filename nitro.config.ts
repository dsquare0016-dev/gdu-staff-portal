import { defineConfig } from 'nitro/config';
import { resolve } from 'path';

export default defineConfig({
  preset: 'vercel',
  publicAssets: [
    {
      dir: resolve(__dirname, 'dist/client'),
      maxAge: 31536000,
    },
    {
      dir: resolve(__dirname, 'public'),
      maxAge: 31536000,
    }
  ],
  serverAssets: [
    {
      baseName: 'public',
      dir: resolve(__dirname, 'public')
    }
  ],
  prerender: {
    crawlLinks: true,
  }
});
