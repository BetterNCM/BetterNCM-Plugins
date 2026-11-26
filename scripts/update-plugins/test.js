import fs, { rm } from 'fs';
import path from 'path';
import { Octokit } from 'octokit';

const updatePlugin = async (plugin) => {
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.slug}`);
	
	// get last commit hash
	const commitInfoJson = path.resolve(process.cwd(), `../../commit-info/${plugin.slug}.json`);
	let lastCommitHash = '';
	if (fs.existsSync(commitInfoJson)) {
		const commitInfo = JSON.parse(fs.readFileSync(commitInfoJson, 'utf8'));
		lastCommitHash = commitInfo.lastCommitHash;
	}
	// get current commit hash
	let currentCommitHash = '';
	try {
		currentCommitHash = '1234567';
	} catch (error) {
		console.log("❌ " + error);
	}
	console.log(`🔀 commit hash: ${lastCommitHash} -> ${currentCommitHash}`);
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
};

updatePlugin({
	slug: 'InfLink'
});