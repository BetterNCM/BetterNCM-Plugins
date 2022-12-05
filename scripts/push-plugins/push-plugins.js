import fs_extra from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const tmpPath = path.resolve(process.cwd(), '../../tmp');
const rootPath = path.resolve(process.cwd(), '../../');
const pluginsPath = path.resolve(rootPath, 'BetterNCM-Packed-Plugins');

const repo = `https://BetterNCM-Bot:${process.env.GITHUB_TOKEN}@github.com/BetterNCM/BetterNCM-Packed-Plugins.git`;
execSync(`git clone --single-branch --depth 1 --branch "master" "${repo}"`, { cwd: rootPath });
fs_extra.removeSync(path.resolve(pluginsPath, '.git'));

fs_extra.copySync(tmpPath, pluginsPath, { overwrite: false });