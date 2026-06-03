// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Let TanStack Start use its default server entry for better route matching.
    // Error handling is now moved to src/start.ts via errorMiddleware.
  },
  nitro: {
    preset: "vercel",
  },
  vite: {
    server: {
      port: 3000,
      strictPort: false,
      host: true,
    },
  },
});
