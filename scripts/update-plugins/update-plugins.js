import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import fetch from 'node-fetch';
import download from 'github-download';
import downloadDirectory from 'github-directory-downloader';
import { Octokit } from 'octokit';
import { compareVersions } from 'compare-versions';
import { getPluginList } from '../utils.js';

const repoOwner = 'BetterNCM';
const repoName = 'BetterNCM-Plugins';

const githubToken = process.env.GITHUB_TOKEN;
execSync("git config user.name 'github-actions[bot]'");
execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");
const octokit = new Octokit({
	auth: githubToken,
	userAgent: 'betterncm-plugin-updater'
});

const getPluginCurrentVersion = (slug) => {
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${slug}`);
	if (!fs.existsSync(pluginPath)) return "0";
	const manifest = JSON.parse(fs.readFileSync(path.join(pluginPath, 'manifest.json')));
	return manifest?.version ?? "0";
};

const getPluginListWithCurrentVersion = (pluginList = null) => { // Get plugin list with current version
	if (pluginList === null) {
		pluginList = getPluginList();
	}
	const pluginListWithCurrentVersion = [];
	pluginList.forEach((plugin) => {
		const currentVersion = getPluginCurrentVersion(plugin.slug);
		pluginListWithCurrentVersion.push({
			...plugin,
			currentVersion,
		});
	});
	return pluginListWithCurrentVersion;
}

const getPluginLatestVersion = async (plugin) => {
	const url = `https://github.com/${plugin.repo}/raw/${plugin.branch}${plugin.subpath}/manifest.json?${Date.now()}`;
	try {
		const response = await fetch(url, {
			method: 'GET',
		});
		if (!response.ok) {
			return "0";
		}
		const manifest = await response.json();
		const latestVersion = manifest?.version ?? "0";
		return latestVersion;
	} catch (error) {
		console.log("❌ " + error);
		return "0";
	}	
};

const updatePlugin = async (plugin) => {
	// search if the pull request already exists
	let searchResult = await octokit.rest.search.issuesAndPullRequests({
		q: `repo:${repoOwner}/${repoName} is:pr is:open "${plugin.name} ${plugin.latestVersion}"`,
	});
	const pullRequestExists = searchResult.data.total_count > 0;
	searchResult = await octokit.rest.search.issuesAndPullRequests({
		q: `repo:${repoOwner}/${repoName} is:pr is:closed "${plugin.name} ${plugin.latestVersion}"`,
	});
	const versionRejected = searchResult.data.total_count > 0;
	if (pullRequestExists) {
		console.log(`📋 Pull request already exists for ${plugin.slug} ${plugin.latestVersion}`);
		console.log(`Pushing new commit to update pull request...`);
	}
	if (versionRejected) {
		console.log(`🚫 Pull request already exists for ${plugin.slug} ${plugin.latestVersion} and has been closed`);
		return;
	}
	console.log(`  - 🔄 Upgrading...`);
	// create new branch
	execSync(`git checkout master`);
	execSync(`git pull origin master`);
	if (!pullRequestExists) {
		execSync(`git checkout -b update-${plugin.slug}-${plugin.latestVersion}`);
	} else {
		try {
			execSync(`git branch -D update-${plugin.slug}-${plugin.latestVersion}`);
		} catch (e) {
			execSync(`git checkout master`);
			execSync(`git branch -D update-${plugin.slug}-${plugin.latestVersion}`);
		}
		// 重新创建分支
		execSync(`git checkout -b update-${plugin.slug}-${plugin.latestVersion}`);
	}

	// if exists, delete
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}`);
	if (fs.existsSync(pluginPath)) {
		fs.rmSync(pluginPath, { recursive: true }, (err) => {});
	}
	// download plugin from subpath of given branch of repo
	if (plugin.subpath == '/') {
		await new Promise (resolve => {
			download({
					user: plugin.repo.split('/')[0],
					repo: plugin.repo.split('/')[1],
					ref: plugin.branch
				}, 
				path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}`)
			).on('end', function() {
				resolve();
			})
		});
		console.log(`  - 📦 Downloaded ${plugin.slug} ${plugin.latestVersion} from ${plugin.repo}#${plugin.branch}`);
	} else {
		const stats = await downloadDirectory(
			`https://github.com/${plugin.repo}/tree/${plugin.branch}${plugin.subpath}`,
			path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}`),
			{ token: githubToken }
		);
		console.log(stats);
		console.log(`  - 📦 Downloaded ${plugin.slug} ${plugin.latestVersion} from ${plugin.repo}#${plugin.branch}${plugin.subpath}`);
	}
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
						fs.rmSync(filePath, { recursive: true }, (err) => {});
					} else {
						fs.unlinkSync(filePath);
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
	// get last commit hash
	const commitInfoJson = path.resolve(process.cwd(), `../../commit-info/${plugin.slug}.json`);
	let lastCommitHash = '';
	if (fs.existsSync(commitInfoJson)) {
		const commitInfo = JSON.parse(fs.readFileSync(commitInfoJson, 'utf8'));
		lastCommitHash = commitInfo.lastCommitHash;
	}
	// get current commit hash
	let currentCommitHash = '', defaultBranch = '';
	try {
		defaultBranch = (await octokit.request(`GET /repos/${plugin.repo.split('/')[0]}/${plugin.repo.split('/')[1]}`, {
			owner: plugin.repo.split('/')[0],
			repo: plugin.repo.split('/')[1],
		})).data.default_branch;
		currentCommitHash = (await octokit.request(`GET /repos/${plugin.repo.split('/')[0]}/${plugin.repo.split('/')[1]}/commits`, {
			owner: plugin.repo.split('/')[0],
			repo: plugin.repo.split('/')[1],
			ref: defaultBranch
		})).data[0].sha;
	} catch (error) {
		console.log("❌ " + error);
	}
	console.log(`🔀 commit hash: ${lastCommitHash.substring(0, 7)} -> ${currentCommitHash.substring(0, 7)}`);
	// get manifest
	const manifestPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}/manifest.json`);
	if (!fs.existsSync(manifestPath)) {
		console.log(`❌ manifest.json not found`);
		return;
	}
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	let dangerousLevel = 0;
	if (manifest['force-update'] || manifest['force-uninstall']) {
		dangerousLevel = 1;
	}
	if (manifest['force-install']) {
		dangerousLevel = 2;
	}
	// write commit info
	if (!fs.existsSync(commitInfoJson)) {
		fs.writeFileSync(commitInfoJson, JSON.stringify({
			lastCommitHash: currentCommitHash
		}));
	} else {
		const commitInfo = JSON.parse(fs.readFileSync(commitInfoJson, 'utf8'));
		commitInfo.lastCommitHash = currentCommitHash;
		fs.writeFileSync(commitInfoJson, JSON.stringify(commitInfo));
	}

	// commit
	execSync(`git add --all`);
	execSync(`git commit -m "Update ${plugin.slug} to ${plugin.latestVersion}"`);
	// push
	execSync(`git push --force origin update-${plugin.slug}-${plugin.latestVersion}`);
	// create pull request
	if (pullRequestExists) {
		console.log(`🔼 The branch for PR has been updated`);
		return;
	}
	let body = `\`${plugin.currentVersion}\` -> \`${plugin.latestVersion}\`\n\n`;
	body += `Repo: https://github.com/${plugin.repo}/\n\n`;
	body += `[🔀 Compare changes](https://github.com/${plugin.repo}/compare/${lastCommitHash.substring(0, 7)}...${defaultBranch})`;
	if (dangerousLevel === 1) {
		body += `\n\n> **Info**\n> 该更新含有 \`force-update\` 或 \`force-uninstall\` 字段`;
	}
	if (dangerousLevel === 2) {
		body += `\n\n> **Warning**\n> 该更新含有 \`force-install\` 字段`;
	}
	const emoji = ['', '🔵 ', '🟠 '][dangerousLevel];
	const { data: pullRequest } = await octokit.rest.pulls.create({
		owner: repoOwner,
		repo: repoName,
		title: `${emoji}Update ${plugin.name} to ${plugin.latestVersion}`,
		body: body,
		head: `update-${plugin.slug}-${plugin.latestVersion}`,
		base: 'master'
	});
	console.log(`  - 📝 Pull request created: ${pullRequest.html_url}`);
};

const updateAllPlugins = async (plugins = null) => {
	if (plugins == null) {
		plugins = getPluginListWithCurrentVersion();
	}

	console.log("🔌 Plugin list:");

	for (const plugin of plugins) {
		console.log(`- ${plugin.name} (${plugin.slug})`);
		console.log(`  - Current version: ${plugin.currentVersion}`);
		plugin.latestVersion = await getPluginLatestVersion(plugin);
		console.log(`  - Latest version: ${plugin.latestVersion}`);
		if (compareVersions(plugin.latestVersion, plugin.currentVersion) > 0) {
			console.log(`  - ⏫ Has update!`);
			try{
			    await updatePlugin(plugin);
			}catch(e){
			    console.error(`    - 🔴 Failed to update plugin: ${e}`);
			}
		} else {
			console.log(`  - ✅ No update`);
		}
	}
	execSync(`git checkout master`);
}
await updateAllPlugins();
