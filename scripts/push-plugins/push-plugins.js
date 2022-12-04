import fs_extra from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

execSync("git config user.name 'github-actions[bot]'");
execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");

const tmpPath = path.resolve(process.cwd(), '../../tmp');
const rootPath = path.resolve(process.cwd(), '../../../');
execSync('git clone https://github.com/BetterNCM/BetterNCM-Packed-Plugins.git', { cwd: rootPath });
fs_extra.copySync(tmpPath, path.resolve(rootPath, 'BetterNCM-Packed-Plugins'), { overwrite: false });
/*execSync('git add .', { cwd: rootPath + '/BetterNCM-Packed-Plugins' });
execSync('git commit -m "update"', { cwd: rootPath + '/BetterNCM-Packed-Plugins' });
execSync('git push', { cwd: rootPath + '/BetterNCM-Packed-Plugins' });

*/