import fs from 'fs';
import path from 'path';
import { Octokit } from 'octokit';
import { getPluginList } from '../utils.js';


const githubToken = process.env.GITHUB_TOKEN;
const octokit = new Octokit({
	auth: githubToken,
	userAgent: 'betterncm-plugin-updater'
});


const pluginList = getPluginList();

const starsJson = {};

for (const plugin of pluginList) {
	try {
		starsJson[plugin.repo] = (await octokit.request(`GET /repos/${plugin.repo.split('/')[0]}/${plugin.repo.split('/')[1]}`, {
			owner: plugin.repo.split('/')[0],
			repo: plugin.repo.split('/')[1],
		})).data.stargazers_count;
		console.log(`⭐ ${plugin.repo} has ${starsJson[plugin.repo]} stars`);
	} catch (error) {
		console.log("❌ " + error);
	}
}
fs.writeFileSync(path.resolve(process.cwd(), `../../plugins-data/stars.json`), JSON.stringify(starsJson, null, 2));