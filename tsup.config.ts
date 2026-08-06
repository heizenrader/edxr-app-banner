import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: ["react"],
  // Next.js App Router needs the directive preserved at the top of the bundle;
  // CRA/webpack treats it as an inert string literal.
  banner: { js: '"use client";' },
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
