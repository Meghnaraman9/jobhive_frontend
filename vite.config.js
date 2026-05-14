import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
    base: "/jobhive_frontend/",
=======
    base:"/jobhive_frontend/",
>>>>>>> f8948b6 (github pages setup)

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
