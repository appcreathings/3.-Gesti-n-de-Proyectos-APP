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
      routes: ["/"],
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});