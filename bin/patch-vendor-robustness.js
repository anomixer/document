/**
 * Harden the vendored OnlyOffice editor app.js against a crash that takes
 * down the WHOLE editor when a single UI caption string is missing.
 *
 * Background (reproduced 2026-08-20, v9 vendor): in app.js the button caption
 * setter ends with
 *
 *     .attr("aria-label", "string"==typeof t?t:t[0])
 *
 * When a caption key is absent from the active locale table (e.g. a v9-only
 * feature whose string the zh-TW / zh table does not carry), `t` is `undefined`,
 * so `t[0]` throws "Cannot read properties of undefined (reading '0')". That
 * error surfaces as `Asc.c_oAscError.ID.EditingError`, which makes the editor
 * call disableEditing(true) and trigger "api:disconnect" -- the user sees a
 * blank page, a fully-greyed toolbar, and the "An error occurred during the
 * work with the document / use DownloadAs to back up" dialog. English is
 * unaffected (its table is complete), so the bug only shows in locales with
 * missing keys.
 *
 * A missing translation string must degrade to a blank label, never crash the
 * entire editor. This script rewrites the offending expression so the fallback
 * branch is `t?t[0]:""` instead of `t[0]`. It is idempotent (no-op once applied)
 * and scans the whole vendored tree, so it also covers editors added in future
 * vendor drops. Re-run is safe; bin/build.sh invokes it on every build so the
 * hardening survives a re-vendor.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webApps = join(root, 'public', 'web-apps');

const BUGGY = `"string"==typeof t?t:t[0]`;
const FIXED = `"string"==typeof t?t:(t?t[0]:"")`;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && e.name.endsWith('.js')) {
      yield full;
    }
  }
}

let touched = 0;
let appliedTotal = 0;
for (const file of walk(webApps)) {
  const src = readFileSync(file, 'utf-8');
  const count = src.split(BUGGY).length - 1;
  if (count > 0) {
    writeFileSync(file, src.split(BUGGY).join(FIXED), 'utf-8');
    touched += 1;
    appliedTotal += count;
    console.log(`  hardened ${relative(root, file)} (${count})`);
  }
}
if (touched === 0) {
  console.log('  vendor caption hardening: already applied (nothing to do)');
} else {
  console.log(`  vendor caption hardening: ${appliedTotal} site(s) across ${touched} file(s)`);
}
