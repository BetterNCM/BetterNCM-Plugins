import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import compressing from 'compressing';
import { getPluginList, getStarCount } from '../utils.js';

const compulsoryFields = ['name', 'author', 'version'];
const optionalFields = ['description', 'requirements', 'betterncm_version', 'preview', 'author_links', 'type', 'hide', 'deprecated', 'license', 'incompatible', 'force-update', 'force-install', 'force-uninstall'];

const getSlugName = (name) => {
	if (!name) return null;
	return name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '-');
};
const addField = (json, field, value) => {
	if (value) {
		json[field] = value;
	}
};
const checkCompulsoryFields = (json, pluginName) => {
	for (const field of compulsoryFields) {
		if (!json[field]) {
			console.log(`❌ Plugin ${pluginName} is missing field ${field} in manifest.json.`);
			return false;
		}
	}
	return true;
};

const definedPluginList = getPluginList();
const starCount = getStarCount();

const tmpPath = path.resolve(process.cwd(), '../../tmp');
if (fs.existsSync(tmpPath)) {
	fs.rmSync(tmpPath, { recursive: true });
}
fs.mkdirSync(tmpPath);
fs.mkdirSync(path.resolve(tmpPath, 'plugins'));
fs.mkdirSync(path.resolve(tmpPath, 'previews'));

!(async()=>{

	let pluginList = [];

	const plugins = fs.readdirSync(path.resolve(process.cwd(), '../../plugins-data'));
	for(const plugin of plugins){
		if (plugin.startsWith('.')) continue;
		if (!fs.existsSync(path.resolve(process.cwd(), `../../plugins-data/${plugin}/manifest.json`))) {
			console.log(`❌ Plugin ${plugin} has no manifest.json.`);
			continue;
		}
		const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `../../plugins-data/${plugin}/manifest.json`)));

		let pluginJson = {};
		for (const field of compulsoryFields) {
			addField(pluginJson, field, manifest[field]);
		}
		if (!checkCompulsoryFields(pluginJson, plugin)) {
			console.log(`⏩ Packing skipped.`);
			continue;
		}
		for (const field of optionalFields) {
			addField(pluginJson, field, manifest[field]);
		}
		const slug = manifest?.slug ?? getSlugName(manifest.name);
		addField(pluginJson, 'slug', slug);
		addField(pluginJson, 'update_time', parseInt(execSync(`git log -1 --format=%ct ${path.resolve(process.cwd(), `../../plugins-data/${plugin}/manifest.json`)}`)));
		addField(pluginJson, 'publish_time', parseInt(execSync(`git log --reverse --format=%ct ${path.resolve(process.cwd(), `../../plugins-data/${plugin}/manifest.json`)}`).toString().split('\n')[0]));
		const repo = definedPluginList.find((definedPlugin) => definedPlugin.slug === plugin)?.repo ?? '';
		addField(pluginJson, 'repo', repo);
		addField(pluginJson, 'stars', starCount[repo] ?? 0);

		try {
			const repo = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `../../plugins-list/${slug}.json`))).repo;
			addField(pluginJson, 'repo', repo);
		} catch {}

		if (pluginJson.preview) {
			pluginJson.preview = pluginJson.preview.replace(/^\.?[\\/]/g, '');
			if (!fs.existsSync(path.resolve(process.cwd(), `../../plugins-data/${plugin}/${pluginJson.preview}`))) {
				console.log(`🖼️ Preview of ${plugin} not found, ignored.`);
				delete pluginJson.preview;
			}else{
				const suffix = pluginJson.preview.split('.').pop();
				fs.copyFileSync(path.resolve(process.cwd(), `../../plugins-data/${plugin}/${pluginJson.preview}`), path.resolve(tmpPath, 'previews', `${slug}.${suffix}`));
				fs.rmSync(path.resolve(process.cwd(), `../../plugins-data/${plugin}/${pluginJson.preview}`));
				pluginJson.preview = `previews/${slug}.${suffix}`;
			}
		}

		if (manifest.native_plugin) {
			addField(pluginJson, 'native', true);
		}
		if (manifest.require_restart) {
			addField(pluginJson, 'require_restart', true);
		}


		const pluginPath = path.resolve(process.cwd(), `../../tmp/plugins/${slug}-${manifest.version}.plugin`);
		await compressing.zip.compressDir(path.resolve(process.cwd(), `../../plugins-data/${plugin}`), pluginPath, {
			ignoreBase: true
		});

		const stats = fs.statSync(pluginPath);
		const fileSizeInBytes = stats.size;
		const fileSizeInKiB = fileSizeInBytes / 1024;
		if (fileSizeInKiB > 800) {
		  console.warn(`⚠️ 插件 ${slug} 文件大于 800KiB，正在跳过`);
		  console.warn(`⏩ ${slug} ${manifest.version} skipped.`);
		  continue;
		} else if (fileSizeInKiB > 600) {
		  console.warn(`⚠️ 插件 ${slug} 文件大于 600KiB`);
		}

		addField(pluginJson, 'file', `${slug}-${manifest.version}.plugin`);
		addField(pluginJson, 'file-url', `plugins/${slug}-${manifest.version}.plugin`);

		pluginList.push(pluginJson);
		console.log(`📦 ${slug} ${manifest.version} packed.`);
	}

	const allJson = JSON.stringify(pluginList, null, 4);
	fs.writeFileSync(path.resolve(process.cwd(), '../../tmp/plugins.json'), allJson);
	console.log('\n✅ All plugins packed.');
})()
