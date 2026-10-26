import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const readConfig = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

describe('Carmen runtime config files', () => {
  it('serves the local API config during development', async () => {
    const config = await readConfig('../public/config.js');

    expect(config).toContain('http://localhost/Carmen.WebApi');
    expect(config).toContain('env: "dev"');
  });

  it('copies the hosted API config into production builds', async () => {
    const config = await readConfig('./production/config.js');

    expect(config).toContain('https://dev.carmen4.com/carmen.api2');
    expect(config).toContain('env: "production"');
  });
});
