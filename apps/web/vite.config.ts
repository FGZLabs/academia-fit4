import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Extremo Norte - Liberdade",
        short_name: "Extremo Norte",
        description: "Cadastro, frequência e gestão da Extremo Norte - Liberdade",
        theme_color: "#0b1324",
        background_color: "#f3f6fb",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg}"]
      }
    })
  ]
});
