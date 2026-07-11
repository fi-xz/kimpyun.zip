import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  appType: "mpa",
  plugins: [
    react(),
    {
      name: "dev-404",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0] ?? "/";

          // Vite internals, assets with extensions, dot-paths
          if (
            url.startsWith("/@") ||
            url.startsWith("/.") ||
            url.startsWith("/src/") ||
            url.startsWith("/node_modules/") ||
            /\.[^/]+$/.test(url)
          ) {
            next();
            return;
          }

          // Redirect bare directory paths to trailing-slash canonical
          if (url === "/available-urls") {
            res.writeHead(301, { Location: "/available-urls/" });
            res.end();
            return;
          }

          // Known HTML routes
          if (url === "/" || url.startsWith("/available-urls/")) {
            next();
            return;
          }

          // Unknown → rewrite to 404.html, let Vite serve with HMR
          req.url = "/404.html";
          res.statusCode = 404;
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        availableUrls: resolve(__dirname, "available-urls/index.html"),
        notFound: resolve(__dirname, "404.html"),
      },
    },
  },
});
