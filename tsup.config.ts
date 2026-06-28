import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"],
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: "dist",
});
