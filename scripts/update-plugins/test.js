import fs, { rm } from 'fs';
import path from 'path';

const updatePlugin = async (plugin) => {
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}`);
	// .betterncm-ignore
	const ignorePath = path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}/.betterncm-ignore`);
	if (fs.existsSync(ignorePath)) {
		console.log(`📜 .betterncm-ignore found`);
		const ignoreContent = fs.readFileSync(ignorePath, 'utf8');
		let ignoreList = ignoreContent.split('\n').filter((line) => line.trim() !== '').map((line) => line.trim());
		ignoreList.push('.betterncm-ignore');
		for (let i = 0; i < ignoreList.length; i++) {
			let ignoreItem = ignoreList[i];
			ignoreItem = ignoreItem.replace(/\\/g, '/');
			let ignoreItemRegex = ignoreItem.replace(/\*/g, '(.*)');
			ignoreItemRegex = ignoreItemRegex.replace(/\?/g, '(.*)');
			ignoreItemRegex = ignoreItemRegex.replace(/\//g, '\\/');
			if (ignoreItem.startsWith('/')) {
				ignoreItemRegex = '^' + ignoreItemRegex;
			}
			if (!ignoreItem.endsWith('/')) {
				ignoreItemRegex = ignoreItemRegex + '\/?';
			}
			//ignoreItemRegex = ignoreItemRegex + '$';
			ignoreItemRegex = new RegExp(ignoreItemRegex);
			ignoreList[i] = ignoreItemRegex;
		}
		console.log('📜 Rules: ' + ignoreList);
		const satisifyIgnoreList = (path) => {
			for (let i = 0; i < ignoreList.length; i++) {
				const ignoreItemRegex = ignoreList[i];
				if (ignoreItemRegex.test(path)) {
					return true;
				}
			}
			return false;
		}
		const iterate = (dir) => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.resolve(dir, file);
				const isDirectory = fs.statSync(filePath).isDirectory();
				const relativePath = ('/' + path.relative(pluginPath, filePath) + (isDirectory ? '/' : '')).replace(/\\/g, '/');
				if (satisifyIgnoreList(relativePath)) {
					if (isDirectory) {
						//fs.rmSync(filePath, { recursive: true }, (err) => {});
					} else {
						//fs.unlinkSync(filePath);
					}
					console.log('🗑️ Ignored', relativePath);
					continue;
				}
				if (isDirectory) {
					iterate(filePath);
				}
			}
		}
		iterate(pluginPath);
	}
};

updatePlugin({
	slug: 'InfLink'
});