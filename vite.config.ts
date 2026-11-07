import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.TARTIL_BASE ?? "/mushafuk-tartil/",
  build: { target: "es2022" },
});
