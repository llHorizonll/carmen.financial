import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const distDir = join(root, 'dist');
const auditUrl = process.env.PERF_URL || 'http://127.0.0.1:4173/financial2/';
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const bundleOnly = args.has('--bundle-only');
const skipBuild = args.has('--skip-build');
const enforceBudgets = !args.has('--no-budget');
const keepArtifacts = args.has('--keep-artifacts');
const desktopRuns = quick ? 1 : 3;
const mobileRuns = quick ? 1 : 5;

const limits = {
  entryJsGzipKb: 100,
  initialCssGzipKb: 25,
  desktopScore: 1,
  mobileMedianScore: 1,
  mobileMinimumScore: 0.98,
  mobileFcpMs: 1800,
  mobileLcpMs: 2500,
  mobileTbtMs: 100,
  mobileCls: 0.1,
};

const run = (command, commandArgs, options = {}) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });
  child.once('error', rejectRun);
  child.once('exit', (code) => {
    if (code === 0) resolveRun();
    else rejectRun(new Error(`${command} exited with code ${code}`));
  });
});

const toAssetPath = (assetUrl) => {
  const marker = '/assets/';
  const markerIndex = assetUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  return join(distDir, 'assets', assetUrl.slice(markerIndex + marker.length));
};

const gzipKb = async (filePath) => gzipSync(await readFile(filePath)).byteLength / 1024;

const inspectBundle = async () => {
  const html = await readFile(join(distDir, 'index.html'), 'utf8');
  const entryUrls = [...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const cssUrls = [...new Set([...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((match) => match[1]))];
  const inlineCriticalCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
  const preloadUrls = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
  const entryJsGzipKb = await sumGzip(entryUrls);
  const deferredCssGzipKb = await sumGzip(cssUrls);
  const inlineCriticalCssGzipKb = inlineCriticalCss
    .reduce((total, css) => total + (gzipSync(css).byteLength / 1024), 0);
  const initialCssGzipKb = deferredCssGzipKb + inlineCriticalCssGzipKb;
  const preloadJsGzipKb = await sumGzip(preloadUrls);
  const initialAssetNames = [...entryUrls, ...cssUrls, ...preloadUrls].join(' ').toLowerCase();
  const forbiddenInitialChunks = ['xlsx', 'reportsetup', 'mapping', 'ocr', 'accessmodal']
    .filter((name) => initialAssetNames.includes(name));

  return {
    entryJsGzipKb,
    preloadJsGzipKb,
    totalInitialJsGzipKb: entryJsGzipKb + preloadJsGzipKb,
    initialCssGzipKb,
    inlineCriticalCssGzipKb,
    deferredCssGzipKb,
    forbiddenInitialChunks,
  };
};

const sumGzip = async (urls) => {
  const sizes = await Promise.all(urls.map(async (url) => {
    const assetPath = toAssetPath(url);
    return assetPath && existsSync(assetPath) ? gzipKb(assetPath) : 0;
  }));
  return sizes.reduce((total, size) => total + size, 0);
};

const waitForPreview = async () => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(auditUrl);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Vite preview did not become ready at ${auditUrl}`);
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const auditProfile = async (profile, runs, artifactDir) => {
  const results = [];
  for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
    const outputPath = join(artifactDir, `${profile}-${runIndex}.json`);
    const lighthouseArgs = [
      join(root, 'node_modules', 'lighthouse', 'cli', 'index.js'),
      auditUrl,
      '--quiet',
      '--only-categories=performance',
      '--output=json',
      `--output-path=${outputPath}`,
      '--chrome-flags=--headless=new --disable-gpu --no-sandbox',
    ];
    if (profile === 'desktop') lighthouseArgs.push('--preset=desktop');

    await run(process.execPath, lighthouseArgs);
    const report = JSON.parse(await readFile(outputPath, 'utf8'));
    results.push({
      score: report.categories.performance.score,
      fcp: report.audits['first-contentful-paint'].numericValue,
      lcp: report.audits['largest-contentful-paint'].numericValue,
      tbt: report.audits['total-blocking-time'].numericValue,
      cls: report.audits['cumulative-layout-shift'].numericValue,
    });
    process.stdout.write(`${profile} ${runIndex}/${runs}: ${Math.round(results.at(-1).score * 100)}\n`);
  }
  return results;
};

const summarize = (results) => ({
  score: median(results.map((result) => result.score)),
  minimumScore: Math.min(...results.map((result) => result.score)),
  fcp: median(results.map((result) => result.fcp)),
  lcp: median(results.map((result) => result.lcp)),
  tbt: median(results.map((result) => result.tbt)),
  cls: median(results.map((result) => result.cls)),
});

const check = (condition, message, failures) => {
  if (!condition) failures.push(message);
};

let previewProcess;
let artifactDir;

try {
  if (!skipBuild) await run('bun', ['run', 'build']);

  const bundle = await inspectBundle();
  process.stdout.write(`Bundle: entry JS ${bundle.entryJsGzipKb.toFixed(2)} KB gzip, module preloads ${bundle.preloadJsGzipKb.toFixed(2)} KB gzip, total initial JS ${bundle.totalInitialJsGzipKb.toFixed(2)} KB gzip, critical CSS ${bundle.inlineCriticalCssGzipKb.toFixed(2)} KB gzip + deferred CSS ${bundle.deferredCssGzipKb.toFixed(2)} KB gzip = ${bundle.initialCssGzipKb.toFixed(2)} KB gzip\n`);

  const failures = [];
  check(bundle.entryJsGzipKb <= limits.entryJsGzipKb, `Entry JS exceeds ${limits.entryJsGzipKb} KB gzip.`, failures);
  check(bundle.initialCssGzipKb <= limits.initialCssGzipKb, `Initial CSS exceeds ${limits.initialCssGzipKb} KB gzip.`, failures);
  check(bundle.forbiddenInitialChunks.length === 0, `Deferred chunks found in initial HTML: ${bundle.forbiddenInitialChunks.join(', ')}.`, failures);

  if (!bundleOnly) {
    artifactDir = await mkdtemp(join(tmpdir(), 'carmen-lighthouse-'));
    previewProcess = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
      cwd: root,
      stdio: 'ignore',
    });
    await waitForPreview();

    const desktop = summarize(await auditProfile('desktop', desktopRuns, artifactDir));
    const mobile = summarize(await auditProfile('mobile', mobileRuns, artifactDir));
    process.stdout.write(`Desktop median: score ${Math.round(desktop.score * 100)}, FCP ${Math.round(desktop.fcp)} ms, LCP ${Math.round(desktop.lcp)} ms, TBT ${Math.round(desktop.tbt)} ms, CLS ${desktop.cls.toFixed(3)}\n`);
    process.stdout.write(`Mobile median: score ${Math.round(mobile.score * 100)}, FCP ${Math.round(mobile.fcp)} ms, LCP ${Math.round(mobile.lcp)} ms, TBT ${Math.round(mobile.tbt)} ms, CLS ${mobile.cls.toFixed(3)}\n`);

    check(desktop.score >= limits.desktopScore, 'Desktop Lighthouse score is below 100.', failures);
    check(mobile.score >= limits.mobileMedianScore, 'Mobile Lighthouse median score is below 100.', failures);
    check(mobile.minimumScore >= limits.mobileMinimumScore, 'A mobile Lighthouse run scored below 98.', failures);
    check(mobile.fcp <= limits.mobileFcpMs, `Mobile FCP exceeds ${limits.mobileFcpMs} ms.`, failures);
    check(mobile.lcp <= limits.mobileLcpMs, `Mobile LCP exceeds ${limits.mobileLcpMs} ms.`, failures);
    check(mobile.tbt < limits.mobileTbtMs, `Mobile TBT is not below ${limits.mobileTbtMs} ms.`, failures);
    check(mobile.cls < limits.mobileCls, `Mobile CLS is not below ${limits.mobileCls}.`, failures);
  }

  if (failures.length > 0) {
    process.stderr.write(`Performance gate failed:\n- ${failures.join('\n- ')}\n`);
    if (enforceBudgets) process.exitCode = 1;
  } else {
    process.stdout.write('Performance gate passed.\n');
  }
} finally {
  previewProcess?.kill('SIGTERM');
  if (artifactDir && keepArtifacts) {
    process.stdout.write(`Lighthouse artifacts: ${artifactDir}\n`);
  } else if (artifactDir) {
    await rm(artifactDir, { recursive: true, force: true });
  }
}
