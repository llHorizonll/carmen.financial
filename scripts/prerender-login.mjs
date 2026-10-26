import React from 'react';
import { PassThrough } from 'node:stream';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderToPipeableStream } from 'react-dom/server';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const htmlPath = resolve(root, 'dist', 'index.html');
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const { default: LoginShell } = await vite.ssrLoadModule('/src/app/LoginShell.jsx');
  const markup = await new Promise((resolveMarkup, rejectMarkup) => {
    let output = '';
    const destination = new PassThrough();
    destination.setEncoding('utf8');
    destination.on('data', (chunk) => { output += chunk; });
    destination.on('end', () => resolveMarkup(output));
    destination.on('error', rejectMarkup);

    const stream = renderToPipeableStream(React.createElement(LoginShell), {
      onAllReady() {
        stream.pipe(destination);
      },
      onError(error) {
        rejectMarkup(error);
      },
    });
  });

  const html = await readFile(htmlPath, 'utf8');
  await writeFile(htmlPath, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`));
} finally {
  await vite.close();
}
