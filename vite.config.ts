import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logos/ogo.png"],
      manifest: {
        name: "DGDreams",
        short_name: "DGDreams",
        description: "Multi-chain Web3 task hub. Execute daily on-chain actions across 12 EVM networks.",
        theme_color: "#111217",
        background_color: "#111217",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          { src: "/logos/ogo.png", sizes: "192x192", type: "image/png" },
          { src: "/logos/ogo.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/, handler: "CacheFirst", options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } } },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
