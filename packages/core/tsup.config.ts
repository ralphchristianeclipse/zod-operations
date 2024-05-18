import { defineConfig, Options } from "tsup";

const tsup: Options = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  minify: true,
  // treeshake: true,
  clean: true,
  tsconfig: "tsconfig.json",
  sourcemap: true,
  target: "es2020",
  skipNodeModulesBundle: true,
};

const tsupConfig = defineConfig(tsup);

export default tsupConfig;
