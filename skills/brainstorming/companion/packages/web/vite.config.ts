import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: { outDir: "dist", target: "es2022" },
  server: { proxy: { "/api": "http://localhost:3344" } },
});
