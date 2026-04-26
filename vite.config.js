import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Dev-only: forward /api/* to a deployed backend so room + payment APIs work with `npm run dev`. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "https://comparizzon.com";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
