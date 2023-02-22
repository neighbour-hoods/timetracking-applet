// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { fromRollup } from "@web/dev-server-rollup";
import rollupReplace from "@rollup/plugin-replace";
import rollupCommonjs from "@rollup/plugin-commonjs";

const replace = fromRollup(rollupReplace);
const commonjs = fromRollup(rollupCommonjs);

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes("--hmr");

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: true,
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ["browser", "development"],
    browser: true,
    preferBuiltins: false,
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: "./demo/index.html",
  rootDir: '../',
  clearTerminalOnReload: false,

  plugins: [
    replace({
      "process.env.HC_PORT": JSON.stringify(process.env.HC_PORT),
      "process.env.ADMIN_PORT": JSON.stringify(process.env.ADMIN_PORT) || undefined,
      "process.env.REACT_APP_HC_CONN_URL": process.env.HC_PORT : `ws://localhost:${process.env.HC_PORT}` ? undefined,
      "process.env.REACT_APP_HC_ADMIN_CONN_URL": process.env.ADMIN_PORT : `ws://localhost:${process.env.ADMIN_PORT}` ? undefined,
      "process.env.REACT_APP_HC_APP_ID": undefined,
      delimiters: ["", ""],
    }),

    commonjs(),
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
