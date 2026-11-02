// Build the kit: JavaScript + type declarations with tsc, and the frame stylesheet and its fonts copied next to them.
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
execSync('npx tsc --noEmit false --emitDeclarationOnly false', { stdio: 'inherit' });
mkdirSync('dist', { recursive: true });
copyFileSync('src/styles.css', 'dist/styles.css');
cpSync('src/fonts', 'dist/fonts', { recursive: true });
console.log('built dist/');
