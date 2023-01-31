import fs from 'fs';
import path from 'path';

export const getSlugName = (name) => {
	if (!name) return null;
	return name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '-');
};

export const isValidPluginJson = (json) => {
	if (!json.name) return false;
	if (!json.repo) return false;
	if (!/^([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)$/.test(json.repo)) return false;
	return true;
};	

export const getPluginList = () => {
	const pluginList = [];
	const pluginListPath = path.resolve(process.cwd(), '../../plugins-list');
	const files = fs.readdirSync(pluginListPath);
	files.forEach((file) => {
		if (!file.endsWith('.json')) {
			return;
		}
		const plugin = JSON.parse(fs.readFileSync(path.join(pluginListPath, file)));
	
		if (!isValidPluginJson(plugin)) {
			console.log(`❌ Invalid plugin json (Missing name or repo): ${file}`);
			return;
		}
		plugin.slug = getSlugName(plugin.slug ?? plugin.name) ?? "";
		if (plugin.slug == "") {
			console.log(`❌ No existing slug name and cannot get slug name: ${file}`);
			return;
		}

		plugin.branch = plugin.branch ?? 'master';

		plugin.subpath = plugin?.subpath ?? '/';
		if (plugin.subpath.endsWith('/')) plugin.subpath = plugin.subpath.slice(0, -1);
		if (!plugin.subpath.startsWith('/')) plugin.subpath = `/${plugin.subpath}`;

		pluginList.push(plugin);
	});
	return pluginList;
}
export const getStarCount = () => {
	const starsPath = path.resolve(process.cwd(), '../../stars.json');
	if (fs.existsSync(starsPath)) {
		return JSON.parse(fs.readFileSync(starsPath));
	}
	return {};
}