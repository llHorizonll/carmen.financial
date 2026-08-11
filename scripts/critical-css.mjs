import Critters from 'critters';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve(import.meta.dirname, '..', 'dist');
const htmlPath = resolve(distDir, 'index.html');
const html = await readFile(htmlPath, 'utf8');
const processor = new Critters({
  path: distDir,
  publicPath: '/financial2/',
  compress: true,
  fonts: false,
  keyframes: 'critical',
  preload: false,
  pruneSource: false,
});

const optimizedHtml = await processor.process(html);
const stylesheetPattern = /<link rel="stylesheet"[^>]+href="[^"]+\/assets\/index-[^"]+\.css"[^>]*>/;
const stylesheetLink = optimizedHtml.match(stylesheetPattern)?.[0];
if (!stylesheetLink) throw new Error('Unable to find the application stylesheet after critical CSS extraction.');

const deferredLink = stylesheetLink
  .replace('rel="stylesheet"', 'rel="preload" as="style" data-deferred-stylesheet');
const outputHtml = optimizedHtml.replace(
  stylesheetLink,
  `${deferredLink}<noscript>${stylesheetLink}</noscript>`,
);
await writeFile(htmlPath, outputHtml);
