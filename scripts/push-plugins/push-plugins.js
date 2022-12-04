import fs_extra from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

execSync("git config --global user.name 'BetterNCM-Bot'");
execSync("git config --global user.email 'betterncm-bot@proton.me'");

const tmpPath = path.resolve(process.cwd(), '../../tmp');
const rootPath = path.resolve(process.cwd(), '../../../');
const pluginsPath = path.resolve(rootPath, 'BetterNCM-Packed-Plugins');
execSync('git clone https://github.com/BetterNCM/BetterNCM-Packed-Plugins.git', { cwd: rootPath });
execSync('git remote set-url origin git@github.com:BetterNCM/BetterNCM-Packed-Plugins.git', { cwd: pluginsPath });
fs_extra.copySync(tmpPath, pluginsPath, { overwrite: false });
execSync('git add .', { cwd: pluginsPath });
execSync('git commit -m "update"', { cwd: pluginsPath });
execSync('git push', { cwd: pluginsPath });
