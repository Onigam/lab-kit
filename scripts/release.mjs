// Publish a version: build `dist/`, commit it on a detached HEAD, tag it `vX.Y.Z` and push the tag.
// `main` never contains `dist/`; labs install the tag: `git+https://github.com/Onigam/lab-kit.git#vX.Y.Z`.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = `v${version}`;

if (out('git branch --show-current') !== 'main') throw new Error('Release from the main branch.');
if (out('git status --porcelain')) throw new Error('The working tree is not clean: commit your changes first.');
if (out(`git tag -l ${tag}`)) throw new Error(`${tag} already exists: bump "version" in package.json.`);

run('npm run typecheck');
run('npm run build');
run('git checkout --detach');
try {
  run('git add -f dist');
  run(`git commit -m "release ${tag}"`);
  run(`git tag ${tag}`);
  run(`git push origin ${tag}`);
} finally {
  run('git checkout main');
}
console.log(`\nPublished ${tag}. In a lab:\n  npm i git+https://github.com/Onigam/lab-kit.git#${tag}`);
