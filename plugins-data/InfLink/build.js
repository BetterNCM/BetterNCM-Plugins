const fs = require("fs");
const { build } = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin")
const entryPoints = [];
const checkEntry = (path) => {
    if (fs.existsSync(path)) entryPoints.push(path);
};

checkEntry("src/index.tsx");

build({
    entryPoints,
    target: "chrome91",
    bundle: true,
    sourcemap: process.argv.includes("--dev") ? "inline" : false,
    minify: !process.argv.includes("--dev"),
    outdir: process.argv.includes("--dev") ? "./" : "./",
    define: {
        DEBUG: process.argv.includes("--dev").toString(),
    },
    watch: process.argv.includes("--watch")
        ? {
            onRebuild(err, result) {
                console.log("Rebuilding");
                if (err) {
                    console.warn(err.message);
                } else if (result) {
                    console.log("Build success");
                }
            },
        }
        : undefined,
    plugins: [sassPlugin()],
}).then(() => {
    console.log("Build success");
});
