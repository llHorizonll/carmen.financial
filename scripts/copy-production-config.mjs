import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../config/production/config.js', import.meta.url));
const targetPath = fileURLToPath(new URL('../dist/config.js', import.meta.url));

await copyFile(sourcePath, targetPath);
