#!/usr/bin/env node
// Validate every YAML file in vendors/ against schema/vendor.schema.json.
// Also enforces two invariants beyond the schema:
//   1. Filename slug matches the `slug` field.
//   2. `last_reviewed` is not older than 180 days (warn, not fail — so old
//      entries don't block PRs but the maintainer can prioritize refreshes).
//
// Usage:
//   node scripts/validate.mjs          # exit 1 on any hard failure
//   node scripts/validate.mjs --strict # also exit 1 on stale (>180d) entries

import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const VENDORS = join(ROOT, 'vendors');
const SCHEMA = join(ROOT, 'schema', 'vendor.schema.json');
const STALE_DAYS = 180;
const STRICT = process.argv.includes('--strict');

const schema = JSON.parse(readFileSync(SCHEMA, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = readdirSync(VENDORS).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
if (files.length === 0) {
  console.error('❌ No vendor files found under vendors/');
  process.exit(1);
}

const now = Date.now();
const errors = [];
const warnings = [];
const slugsSeen = new Set();

for (const file of files.sort()) {
  const path = join(VENDORS, file);
  const raw = readFileSync(path, 'utf8');
  let data;
  try {
    data = parseYaml(raw);
  } catch (e) {
    errors.push(`${file}: YAML parse error — ${e.message}`);
    continue;
  }
  if (!validate(data)) {
    for (const err of validate.errors) {
      errors.push(`${file}: ${err.instancePath || '/'} ${err.message}`);
    }
    continue;
  }
  // Beyond-schema invariants:
  const fileSlug = basename(file, extname(file));
  if (data.slug !== fileSlug) {
    errors.push(`${file}: filename slug "${fileSlug}" ≠ entry.slug "${data.slug}"`);
  }
  if (slugsSeen.has(data.slug)) {
    errors.push(`${file}: duplicate slug "${data.slug}"`);
  }
  slugsSeen.add(data.slug);

  const reviewedAt = Date.parse(data.last_reviewed);
  const ageDays = Math.floor((now - reviewedAt) / (1000 * 60 * 60 * 24));
  if (ageDays > STALE_DAYS) {
    const line = `${file}: last_reviewed ${data.last_reviewed} is ${ageDays} days old (limit ${STALE_DAYS}). Please refresh + re-cite sources.`;
    if (STRICT) errors.push(line);
    else warnings.push(line);
  }

  // overall rating should not be greener than the worst dimension —
  // matches the scoring model documented in README.md.
  const dims = ['entity_control', 'data_location', 'operational_access', 'subprocessor_chain', 'transfer_mechanism'];
  const rank = { green: 0, amber: 1, red: 2 };
  const worst = dims.reduce((w, d) => Math.max(w, rank[data.ratings[d]]), 0);
  if (rank[data.ratings.overall] < worst) {
    const worstName = Object.keys(rank).find((k) => rank[k] === worst);
    errors.push(`${file}: overall=${data.ratings.overall} is greener than worst dimension (${worstName}). Overall must ≥ worst per README.md scoring model.`);
  }
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
for (const e of errors) console.error(`❌ ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} hard error${errors.length === 1 ? '' : 's'} — validation failed.`);
  process.exit(1);
}
console.log(`✅ ${files.length} vendor${files.length === 1 ? '' : 's'} validated${warnings.length ? ` (${warnings.length} stale warning${warnings.length === 1 ? '' : 's'})` : ''}.`);
