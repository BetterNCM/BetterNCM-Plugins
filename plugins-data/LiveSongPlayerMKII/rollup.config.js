// https://github.com/7nik/test-svelte-userscript/blob/main/rollup.config.js

import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import styles from "rollup-plugin-styles";
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { less } from 'svelte-preprocess-less';
import preprocess from 'svelte-preprocess';

const production = !!process.env.PROD;

function getMetablock() {
	return ""
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: production ? false : "inline",
		format: 'iife',
		name: 'calc',
		file: 'build/index.js',
		banner: getMetablock,
	},
	plugins: [
		commonjs(),
		nodePolyfills(),
		svelte({
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production
			}, preprocess: preprocess({
				style: less()
			})
		}),
		styles(),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),



		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser({
			format: {
				comments: function leaveMetaBlock(node, { value, type }) {
					return leaveMetaBlock.inmeta;
				}
			}
		})
	]
};