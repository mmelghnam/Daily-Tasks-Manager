import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

const rawPort = process.env.PORT ?? '24245';

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig(async ({ command, mode }) => {
  const cloudflareBuild = process.env.CLOUDFLARE_BUILD === '1';
  const productionBuild = command === 'build' || mode === 'production';
  const plugins = [
    react(),
    tailwindcss({ optimize: false }),
    ...(productionBuild
      ? []
      : [
          await import('@replit/vite-plugin-runtime-error-modal').then((m) =>
            m.default(),
          ),
        ]),
    ...(cloudflareBuild ? [cloudflare()] : []),
    ...(!productionBuild && process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ];

  return {
    base: basePath,
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(
        import.meta.dirname,
        cloudflareBuild ? 'dist/client' : 'dist/public',
      ),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
