import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served under the site's /atelier/postmark/walk/ in production; root in dev.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/atelier/postmark/walk/" : "/",
  server: { port: 4326 },
}));
