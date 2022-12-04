import fs_extra from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

execSync("git config --global user.name 'github-actions[bot]'");
execSync("git config --global user.email 'github-actions[bot]@users.noreply.github.com'");

const tmpPath = path.resolve(process.cwd(), '../../tmp');
const rootPath = path.resolve(process.cwd(), '../../../');
const pluginsPath = path.resolve(rootPath, 'BetterNCM-Packed-Plugins');
execSync('git clone https://github.com/BetterNCM/BetterNCM-Packed-Plugins.git', { cwd: rootPath });
fs_extra.copySync(tmpPath, pluginsPath, { overwrite: false });
execSync('git add .', { cwd: pluginsPath });
execSync('git commit -m "update"', { cwd: pluginsPath });
execSync('git push', { cwd: pluginsPath });
