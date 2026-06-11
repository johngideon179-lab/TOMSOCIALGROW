import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Ensure public directory and PWA icons exist at startup
const publicDir = path.resolve(__dirname, 'public');
const sourceIcon = path.resolve(__dirname, 'src/assets/images/app_icon_1781221525472.jpg');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (fs.existsSync(sourceIcon)) {
  fs.copyFileSync(sourceIcon, path.resolve(publicDir, 'icon-192.png'));
  fs.copyFileSync(sourceIcon, path.resolve(publicDir, 'icon-512.png'));
} else {
  // Back up strategy if source icon isn't present
  console.warn("Source app icon not found; creating fallback icons");
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
