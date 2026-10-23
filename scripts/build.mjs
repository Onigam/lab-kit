// Build the kit: JavaScript + type declarations with tsc, and the frame stylesheet copied next to them.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
execSync('npx tsc --noEmit false --emitDeclarationOnly false', { stdio: 'inherit' });
mkdirSync('dist', { recursive: true });
copyFileSync('src/styles.css', 'dist/styles.css');
console.log('built dist/');
