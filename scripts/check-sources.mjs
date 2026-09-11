#!/usr/bin/env node
// Verify every URL in every vendor's `sources:` array returns a
// non-error HTTP status. Broken sources undermine the whole "we did
// the work" credibility of the tool — a citing journalist clicking
// through to a 404 is the exact failure mode we're trying to avoid.
//
// Follows redirects, treats 2xx and 3xx as OK. HEAD first (cheap);
// falls back to GET if HEAD is rejected (some CDNs refuse HEAD on
// static pages). 20-second per-URL timeout, 8-way concurrency.
//
// Usage:
//   node scripts/check-sources.mjs               # print summary, exit 1 on any 4xx/5xx
//   node scripts/check-sources.mjs --warn-only   # exit 0 even on failures (for
//                                                # opt-in CI without blocking merges)

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const VENDORS = join(ROOT, 'vendors');
const WARN_ONLY = process.argv.includes('--warn-only');
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;

const files = readdirSync(VENDORS).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

/** @type {Array<{file: string, url: string}>} */
const tasks = [];
for (const file of files.sort()) {
  const raw = readFileSync(join(VENDORS, file), 'utf8');
  const data = parseYaml(raw);
  if (!Array.isArray(data.sources)) continue;
  for (const url of data.sources) {
    if (typeof url !== 'string' || !url.startsWith('http')) continue;
    tasks.push({ file, url });
  }
}

async function head(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      // Browser-like UA — some vendors (Hetzner, OpenAI, OVHcloud)
      // return 403 to obvious-bot user-agents even for public pages.
      // Not a perfect fix; those vendors sometimes still bot-detect.
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.5',
      },
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}
async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      // Browser-like UA — some vendors (Hetzner, OpenAI, OVHcloud)
      // return 403 to obvious-bot user-agents even for public pages.
      // Not a perfect fix; those vendors sometimes still bot-detect.
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.5',
      },
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

async function check(url) {
  try {
    const s1 = await head(url);
    if (s1 < 400) return s1;
    // Some CDNs return 4xx on HEAD but 200 on GET.
    const s2 = await get(url);
    return s2;
  } catch (err) {
    return { error: err.message ?? String(err) };
  }
}

const results = new Array(tasks.length);
let inflight = 0;
let cursor = 0;
await new Promise((resolve) => {
  const kick = () => {
    while (inflight < CONCURRENCY && cursor < tasks.length) {
      const i = cursor++;
      inflight++;
      check(tasks[i].url).then((r) => {
        results[i] = r;
        inflight--;
        if (cursor === tasks.length && inflight === 0) resolve();
        else kick();
      });
    }
  };
  if (tasks.length === 0) resolve();
  else kick();
});

const failures = [];
for (let i = 0; i < tasks.length; i++) {
  const r = results[i];
  if (typeof r === 'number' && r < 400) continue;
  const status = typeof r === 'number' ? String(r) : `network: ${r.error}`;
  failures.push({ file: tasks[i].file, url: tasks[i].url, status });
}

for (const f of failures) console.error(`❌ ${f.file}: ${f.status} — ${f.url}`);
if (failures.length === 0) {
  console.log(`✅ ${tasks.length} source URLs across ${files.length} vendors — all reachable.`);
  process.exit(0);
}
console.error(`\n${failures.length} broken source URL${failures.length === 1 ? '' : 's'} out of ${tasks.length}.`);
process.exit(WARN_ONLY ? 0 : 1);
