import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

execSync("git config user.name 'github-actions[bot]'");
execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");

const tmpPath = path.resolve(process.cwd(), '../../tmp');
execSync('cd ../../..');
execSync('git clone https://github.com/BetterNCM/BetterNCM-Packed-Plugins.git')
execSync('cd BetterNCM-Packed-Plugins');
fs.copyFileSync(tmpPath, './', { overwrite: false });
execSync('git add .');
execSync('git commit -m "update"');
execSync('git push');


