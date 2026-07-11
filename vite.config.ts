import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import ViteSitemapPlugin from "vite-plugin-sitemap";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    ViteSitemapPlugin({
      hostname: "https://hito.autos",
      dynamicRoutes: [
        "/app",
        "/app/products",
        "/app/projects",
        "/app/library",
        "/app/automations",
        "/app/notifications",
        "/app/settings",
      ],
      generateRobotsTxt: false,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Hito",
        short_name: "Hito",
        description: "Hito: gestor de proyectos local-first con soporte offline",
        lang: "es",
        theme_color: "#2A4074",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/app",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,svg}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hito\.autos\/assets\/.*\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-runtime",
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 usa Rolldown internamente, que ya no acepta la forma-objeto
        // de `manualChunks` (Rollup clásico) — solo función. Preexistente,
        // ajeno a spec 020: bloqueaba `vite build` para cualquier cambio.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/react-router-dom")) return "vendor-router";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules/@dnd-kit")) return "vendor-dnd";
          if (id.includes("node_modules/react-markdown")) return "vendor-markdown";
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});