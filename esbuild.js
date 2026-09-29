const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
  logLevel: "info",
};

(async () => {
  const ctx = await esbuild.context(buildOptions);
  if (watch) {
    await ctx.watch();
    console.log("Watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Build succeeded");
  }
})();
