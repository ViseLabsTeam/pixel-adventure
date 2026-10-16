import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
const projectRoot = resolve(import.meta.dirname, "../..");
export default defineConfig({
  plugins: [
    react(),
    {
      name: "central-assets",
      configureServer(server) {
        server.middlewares.use("/assets", async (req, res, next) => {
          const relative = decodeURIComponent((req.url ?? "").split("?")[0]);
          const file = resolve(projectRoot, "assets", "." + relative);
          if (
            !file.startsWith(resolve(projectRoot, "assets") + "/") &&
            !file.startsWith(resolve(projectRoot, "assets") + "\\")
          )
            return next();
          if (!/\.(png|webp|gif|json)$/i.test(file)) return next();
          try {
            const data = await readFile(file);
            res.setHeader(
              "Content-Type",
              file.endsWith(".json")
                ? "application/json"
                : file.endsWith(".webp")
                  ? "image/webp"
                  : file.endsWith(".gif")
                    ? "image/gif"
                    : "image/png",
            );
            res.end(data);
          } catch {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:2567",
      "/health": "http://127.0.0.1:2567",
      "/realtime": {
        target: "http://127.0.0.1:2567",
        ws: true,
        rewrite: (p) => p.replace(/^\/realtime/, ""),
      },
    },
  },
  build: { chunkSizeWarningLimit: 1600 },
});
