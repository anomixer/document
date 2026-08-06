/**
 * Generate Editor-specific Traditional Chinese (zh-TW) bundles for OnlyOffice.
 *
 * OnlyOffice's web-apps embed each editor's Simplified Chinese strings as a
 * module inside its minified `app.js`:
 *
 *   define('<editor>/main/locale/zh.json', { 'Common...textTabFile': '文件', ... })
 *
 * and the bootstrap applies that module whenever the frame's `lang` param
 * normalises to `zh` (`lang === 'zh' ? t : en`, where `t` is the zh.json module).
 * The SDK never fetches the on-disk `locale/*.json` files, so the only way to
 * surface Traditional Chinese in the editor is to ship a *second* `app.zh-tw.js`
 * whose embedded zh.json module carries Traditional values.
 *
 * This script reads each editor's `app.js`, converts the embedded zh.json module
 * values with opencc-js (`s2twp`), and writes `app.zh-tw.js` next to it. The rest
 * of the file (code, en.json module) is copied byte-for-byte. Re-run it after an
 * OnlyOffice upgrade to regenerate; it is also invoked from bin/build.sh when the
 * generated bundles are missing or older than app.js.
 *
 * Usage: node bin/build-zh-tw.js
 */
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const editors = ['documenteditor', 'spreadsheeteditor', 'presentationeditor'];

const tw = OpenCC.Converter({ from: 'cn', to: 'twp' });

/**
 * Manual Taiwan-lexicon overrides applied after opencc `s2twp`.
 * `s2twp` converts script + most phrases, but a few mainland terms it leaves as
 * Traditional are not what Taiwan uses. Add here so regenerating the bundles
 * keeps these fixed. Keys/values are matched on the converted (Traditional)
 * string. Order matters — longer / more specific first is safer.
 */
const TAIWAN_OVERRIDES = [
  ['幻燈片', '投影片'], // slide (Taiwan uses 投影片, not 幻燈片)
  ['幻燈', '投影片'], // slide (short form)
  ['文字框', '文字方塊'], // text box
];

/**
 * Convert a JS object literal value that may contain any CJK / phrase text.
 * opencc-js returns a string mirroring the input type; we only convert strings.
 */
function convertValue(value) {
  if (typeof value !== 'string') return value;
  let out = tw(value);
  for (const [from, to] of TAIWAN_OVERRIDES) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Serialise a flat string map back to a single-quoted JS object literal,
 * matching the indentation / CRLF used by the source (2-space, CRLF).
 */
function serializeObject(obj) {
  const jsStr = (s) =>
    "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n') + "'";
  const entries = Object.entries(obj).map(([k, v]) => `  ${jsStr(k)}: ${jsStr(String(v))}`);
  return '{\r\n' + entries.join(',\r\n') + '\r\n}';
}

/**
 * Find the index of the `{` that begins the data object of the embedded zh.json
 * module, and the index just past the matching closing `}`. Skips string literals
 * and comments so a `}` or `{` inside a value doesn't confuse the matcher.
 */
function findDataBounds(s, defineIdx) {
  const open = s.indexOf('{', defineIdx);
  if (open < 0) throw new Error('no { found after define');
  let depth = 0;
  let i = open;
  let inStr = null; // null | "'" | '"'
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      inStr = c;
      i += 1;
      continue;
    }
    if (c === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i = s.indexOf('*/', i + 2);
      if (i < 0) throw new Error('unterminated comment');
      i += 2;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return { start: open, end: i + 1 };
    }
    i += 1;
  }
  throw new Error('no matching closing brace');
}

function buildOne(ed) {
  const dir = join(root, 'public', 'web-apps', 'apps', ed, 'main');
  const appPath = join(dir, 'app.js');
  const outPath = join(dir, 'app.zh-tw.js');
  if (!existsSync(appPath)) {
    console.log(`[skip] ${ed}: app.js not found`);
    return false;
  }
  // Skip regeneration if output is newer than app.js (already built).
  if (existsSync(outPath)) {
    try {
      if (statSync(outPath).mtimeMs >= statSync(appPath).mtimeMs) {
        console.log(`[ok]   ${ed}: app.zh-tw.js is up to date`);
        return true;
      }
    } catch {
      /* fall through to rebuild */
    }
  }

  const s = readFileSync(appPath, 'utf-8');
  const marker = `define('${ed}/main/locale/zh.json'`;
  const defineIdx = s.indexOf(marker);
  if (defineIdx < 0) throw new Error(`${ed}: embedded zh.json module not found`);

  const { start, end } = findDataBounds(s, defineIdx);
  const dataSrc = s.slice(start, end);

  // Evaluate the object literal to get key -> value. The SDK grammar is a flat
  // string map, so `new Function` with a return is safe here.
  // eslint-disable-next-line no-new-func
  const data = new Function(`return (${dataSrc});`)();
  const keys = Object.keys(data);
  const converted = {};
  let changed = 0;
  for (const k of keys) {
    const v = data[k];
    const nv = convertValue(v);
    converted[k] = nv;
    if (nv !== v) changed += 1;
  }
  const newDataSrc = serializeObject(converted);
  const out = s.slice(0, start) + newDataSrc + s.slice(end);

  writeFileSync(outPath, out, 'utf-8');
  console.log(`[gen]  ${ed}: ${keys.length} keys, ${changed} converted -> app.zh-tw.js (${out.length} bytes)`);
  return true;
}

let any = false;
for (const ed of editors) {
  if (buildOne(ed)) any = true;
}
if (!any) {
  console.error('No editor bundles generated.');
  process.exit(1);
}

/**
 * Ensure the bootstrap loader and the index.html data-main patch for an editor.
 * The loader swaps between app.js (Simplified) and app.zh-tw.js (Traditional)
 * based on the frame's `lang` param; index.html must point data-main at it.
 * Re-asserted here (and from bin/build.sh) so a fresh OnlyOffice upgrade — which
 * restores a stock index.html and drops any app-loader.js — is self-healing.
 */
const LOADER_SOURCE = `/*!
 * Editor bootstrap loader.
 *
 * OnlyOffice's web-apps always load \`app.js\`, whose embedded Simplified Chinese
 * strings (the \`define('<editor>/main/locale/zh.json', { ... })\` module) are the
 * only source of UI text — the SDK never fetches the on-disk locale/*.json files.
 *
 * To surface Traditional Chinese we ship a second bundle, \`app.zh-tw.js\`, generated
 * from \`app.js\` by \`bin/build-zh-tw.js\` (opencc s2twp) with the embedded zh.json
 * module converted to Traditional. Both bundles are otherwise identical, so the
 * bootstrap still resolves \`lang === 'zh' ? t : en\` and applies the Traditional
 * module when this file picks \`app.zh-tw\`.
 *
 * This loader reads the frame's \`lang\` query param (set from \`editorConfig.lang\`
 * by the OnlyOffice API) and requires the matching bundle: \`app.zh-tw\` for
 * Traditional Chinese regions (zh-TW / zh-HK / zh-MO / zh-Hant), otherwise \`app\`.
 */
(function () {
  // Parse the frame query string (mirrors the SDK's getUrlParams()).
  function getUrlParams() {
    var params = {};
    var parts = window.location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (!pair[0]) continue;
      var name = decodeURIComponent(pair[0]);
      var value = pair.length > 1 ? decodeURIComponent(pair[1]) : '';
      params[name] = value;
    }
    return params;
  }

  var lang = (getUrlParams().lang || '').toLowerCase();
  var isTraditional = /^zh[-_]?(tw|hk|mo)$/.test(lang);

  require([isTraditional ? 'app.zh-tw' : 'app']);
})();
`;

function ensureBootstrap(ed) {
  const dir = join(root, 'public', 'web-apps', 'apps', ed, 'main');
  const loaderPath = join(dir, 'app-loader.js');
  if (!existsSync(loaderPath) || readFileSync(loaderPath, 'utf-8') !== LOADER_SOURCE) {
    writeFileSync(loaderPath, LOADER_SOURCE, 'utf-8');
    console.log(`[loader] ${ed}: wrote app-loader.js`);
  }

  const ihPath = join(dir, 'index.html');
  let ih = readFileSync(ihPath, 'utf-8');
  const patched = ih.replace(
    '<script data-main="app" src="../../../vendor/requirejs/require.js"></script>',
    '<script data-main="app-loader" src="../../../vendor/requirejs/require.js"></script>',
  );
  if (patched !== ih) {
    writeFileSync(ihPath, patched, 'utf-8');
    console.log(`[loader] ${ed}: patched index.html data-main -> app-loader`);
  }
}

for (const ed of editors) {
  ensureBootstrap(ed);
}
console.log('Bootstrap loader + index.html patch ensured for all editors.');
