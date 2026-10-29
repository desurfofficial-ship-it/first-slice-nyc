import { defineConfig } from "vite";

// base "./" so the built bundle can be served from a subpath
// (the repo's GitHub Pages site) without a rebuild dance.
export default defineConfig({
  base: "./",
  server: {
    host: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
