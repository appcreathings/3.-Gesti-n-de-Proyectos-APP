import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Hito",
        short_name: "Hito",
        description:
          "Hito: gestor de proyectos local-first. Productos, proyectos, procesos (SOPs), checklists, Kanban y automatizaciones.",
        lang: "es",
        theme_color: "#2A4074",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/app",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          {
            src: "/icon-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      // Solo se precachea el app shell; los datos viven en la carpeta local /
      // IndexedDB del usuario, así que el SW nunca sirve datos obsoletos.
      workbox: {
        globPatterns: ["**/*.{js,css,svg}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
