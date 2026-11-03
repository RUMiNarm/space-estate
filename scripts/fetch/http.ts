import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const UA = 'space-estate-data-fetch/0.1 (educational static site; contact via repository)';

export async function get(url: string, tries = 4): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw lastErr;
}

export async function save(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
