import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/poker": {
        target: "http://localhost:13001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/poker/, ""),
      },
    },
  },
});
