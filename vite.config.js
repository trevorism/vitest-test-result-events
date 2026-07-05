import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.js"),
      name: "vitest-test-result-events",
      fileName: (format) => `vitest-test-result-events.${format}.js`,
    },
    rollupOptions: {
      // axios is a declared dependency; keep it external so it is not bundled.
      external: ["axios"],
    },
  },
  plugins: [],
});
