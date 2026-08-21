# AGENTS.md — OnlyOffice editor internals

Notes for AI agents working in this repo (append-only, technical mechanics discovered during real work).

## Spreadsheet Editor Regional Settings (地區 / Region)

The OnlyOffice Spreadsheet Editor's "File → Advanced Settings → Regional settings → Region" dropdown lets a
user pick how currency / date / time and separators are displayed for the workbook.

### Where the region list lives

The dropdown options are a hardcoded array of LCID numbers in the SSE app bundle, built in
`MainSettingsGeneral` and assigned to `this.cmbRegSettings`:

- `public/web-apps/apps/spreadsheeteditor/main/app.js` (stock Simplified bundle)
- `public/web-apps/apps/spreadsheeteditor/main/app.zh-tw.js` (generated Traditional bundle)

Both copies MUST be edited together, at the same location:

```js
[
  // ... list of { value: <LCID>, }, ...
  { value: 1066 },            // vi-VN (Vietnamese)
  { value: 2052 },            // zh-CN (Chinese Simplified)
  { value: 1028 },            // zh-TW (Chinese Traditional, Taiwan) <-- added
]);
```

Each `{ value: <LCID> }` is turned into a dropdown entry via
`Common.util.LanguageInfo.getLocalLanguageName(<lcid>)`, which returns `[code, localName, englishName]`
from the `LanguageInfo` table (an LCID-keyed object). So `1028` renders as `中文(台灣)` automatically.

### Runtime SDK loading (important)

The SSE editor frame loads BOTH SDK files at runtime (confirmed via `document.scripts`):

1. `public/sdkjs/cell/sdk-all-min.js` — from `index.html` direct `<script>`. Contains:
   - `jg` table, exported as `Asc.c_oAscDateTimeFormat` — per-LCID date/time format display strings
     (e.g. `jg[2052]`, `jg[1033]`). **Not** stored in the pretty file.
2. `public/sdkjs/cell/sdk-all.js` (pretty, NOT minified) — pulled in later by the app module graph. Contains:
   - `AscCommon.Bya` — the regional settings table (per-LCID), including currency symbol, decimal/group
     separators, date-order codes, and localized month/day names.
   - `AscCommon.LP` — the default (fallback) regional settings object.

So `AscCommon.Bya` / `AscCommon.LP` are `null` until `sdk-all.js` finishes loading. Both files together
supply the runtime regional data.

### Currency symbol per region

The currency symbol for a region is the `wi` field of its `AscCommon.Bya` entry in `sdk-all.js`:

```js
1028: {
  di: 1028,
  Da: 'zh-TW',
  Kj: 0,
  jj: 1,
  wi: 'NT$',     // <-- currency symbol; Taiwan currently uses NT$ (kept as-is)
  Th: '.',       // decimal separator
  zi: ',',       // group separator
  ...
},
```

- `asc_getCurrencySymbols()` (Format Cells → Currency symbol list) is built by iterating `AscCommon.Bya`
  and returning `{ lcid: <entry>.wi }`.
- `AscCommon.Bya[1028]` already exists and is complete, so only ADDING the LCID to the dropdown was needed
  for `中文(台灣)` to be selectable. No SDK edit was required.

### Notes / gotchas

- The docs/help list `zh-TW` as a supported region; the 7.5.0 bundle just omitted it from the dropdown.
- `jg[1028]` is absent from `sdk-all-min.js`, but the visible regional example / formatting is driven by
  `AscCommon.Bya` (in `sdk-all.js`), so dates/separators work without touching `jg`.
- Region changes are stored in browser `localStorage` per OnlyOffice; the SDK receives the LCID via
  `asc_setLocale` / `Asc.asc_cFormatCellsInfo().asc_setSymbol(lcid)`.
- The region dropdown and SDK are only relevant to the Spreadsheet Editor (not document/presentation).

## Homepage language auto-detect

- The bare homepage (`/`, no query params) redirects if it can pick a locale. Implemented as an inline
  `<script>` in `index.html` `<head>` (before first paint).
- Precedence: an **explicit choice** (`localStorage['ran-lang']`, written by the lang switch in `index.ts`
  and `public/lang-switch.js`) always wins. This lets a zh-TW/zh-CN visitor who switched to EN (`ran-lang='en'`)
  stay on `/` instead of being bounced back to a zh page on their next visit.
- Without a stored choice, it falls back to the browser's zh locale: `zh-tw/zh-hant/zh-hk/zh-mo` → `/zh-TW/`,
  any other `zh*` → `/zh-CN/`, non-zh stays on `/`. First-time zh visitors are auto-landed once, which then
  stores `ran-lang`, so they are kept on that locale until they switch.
- Guard rails: `location.search || location.pathname !== '/'` short-circuits, so deep links like
  `/?new=docx` or `/?locale=zh-TW&new=docx` keep their locale and never redirect.

## GitHub Pages (404 redirect to Cloudflare Pages)

- The real app is deployed to **Cloudflare Pages** (`https://document26.pages.dev/`) automatically on
  every push to `main` (see readme). GitHub Pages is **not** the deploy target.
- If GH Pages is mistakenly pointed at `main` branch `/ (root)`, it serves the **source** `index.html`
  (the Vite SPA shell), whose `./assets/index-*.js` import does not exist in `main` → network 404s.
- To avoid this, set the repo's **Settings → Pages → Build and deployment → Source = `main` branch / `/docs`
  folder**. The `docs/index.html` is a small redirect (meta-refresh + canonical link) to
  `https://document26.pages.dev/`, so the GH Pages URL no longer 404s and points visitors to the real site.

## Word Editor: File menu won't open in English (EN-only crash)

**Symptom**: In the **Spreadsheet/Presentation** editors, clicking **File** works under every locale,
but in the **Document** (Word) editor under **English** the File menu never opens. It throws
`TypeError: Cannot set properties of undefined (setting 'textContent')` at `app.js:27586`.

**Root cause (a stock/upstream bug, NOT our regression — `documenteditor/app.js` is byte-identical to
upstream)**:

1. Word's **English** locale block in `public/web-apps/apps/documenteditor/main/app.js` is **missing three
   translation keys** that every other locale has:
   - `'DE.Views.FileMenu.btnEnableOnlineCaption'`
   - `'DE.Views.FileMenu.btnDisableOnlineCaption'`
   - `'DE.Views.FileMenu.btnDownloadOnlineCaption'`

   They exist in the zh block (lines ~2072-2074) and zh-TW bundle (~2042-2044), and Excel/PPT have them in
   EN (`SSE.Views.FileMenu.*` @ SSE:6926-6927, `PE.Views.FileMenu.*` @ PE:4740-4741). Only **Word EN** omits them.

2. `miToggleOnline` (Word `app.js:22654`) is built with `caption: this.btnDisableOnlineCaption`, which is
   `undefined` under EN. `Common.UI.MenuItem.render` (SSE:28698) then writes an **empty `<a class="menu-item"></a>`**.

3. On opening File, `FileMenu.show()` (`app.js:22744`) unconditionally calls
   `this.miToggleOnline.setCaption(...)`. `setCaption` (`app.js:27583`) does
   `this.cmpEl.find('> a').contents().last()[0].textContent = ...`. Because the anchor is empty,
   `.contents().last()[0]` is `undefined` → the exception aborts `show()` before the menu is laid out.

**Fix**: add the three missing EN strings (mirroring Word's "Document" wording and Excel/PPT style) to the
EN block before `btnToEditCaption`:

- `'DE.Views.FileMenu.btnEnableOnlineCaption': 'Enable Online Document Preview/Edit'`
- `'DE.Views.FileMenu.btnDisableOnlineCaption': 'Disable Online Document Preview/Edit'`
- `'DE.Views.FileMenu.btnDownloadOnlineCaption': 'Download Document'`

**Diagnosis note**: reproduces only after the editor actually runs in EN (our `i18n`/`ran-lang` fix made EN
reach the crash path that zh/zh-TW never triggered). Verified with a Playwright probe (WSL + static serve of
`dist/`): before the fix Word-EN `miToggleOnline`'s anchor had **no children** (`empty-anchor`) while
Excel/PPT had a text node; after adding the strings the Word-EN File menu opens and shows
"Disable Online Document Preview/Edit".

## Docker image

- `Dockerfile` is generic: `node:22` builder runs `corepack prepare pnpm@11.4.0` (matches
  `packageManager` in `package.json`), `pnpm install --frozen-lockfile`, `pnpm run build`
  (`bin/build.sh` → builds the zh-TW editor bundles via `node bin/build-zh-tw.js`, then `vite build`,
  then fingerprints `ran-tokens.*.css` and injects the SW timestamp), then serves `dist/` with
  `joseluisq/static-web-server` from `/public`.
- The fork publishes its own image to `ghcr.io/anomixer/document:latest` via `.github/workflows/docker.yml`
  (builds `ghcr.io/${{ github.repository }}`, multi-arch amd64/arm64 with buildx+QEMU, makes the package
  public).
- docker.yml `permission_denied: write_package` was a THREE-part problem, each needed:
  1. Repo Settings → Actions → General → Workflow permissions → **Read and write permissions**
     (it was defaulting to read-only; a repo-level API PUT via PAT returned 204 but didn't stick, so it had to
     be flipped in the web UI).
  2. The package was **user-owned, not repo-owned**: the original `document` package was created by a manual
     PAT push, so it lived at `users/anomixer/packages/...` with NO `repository` link. A workflow GITHUB_TOKEN
     (scoped to the repo) is denied `write_package` on it. Check via
     `GET /users/anomixer/packages?package_type=container` — the package must show `repository.full_name`.
     Fix: `DELETE /users/anomixer/packages/container/document` (needs `delete:packages` scope), then the next
     workflow push recreates it repo-linked.
  3. The workflow already declares `permissions: packages: write`, which is required but not sufficient.
- STATUS: docker.yml now runs GREEN end-to-end. The workflow push (b705d1e) recreated
  `ghcr.io/anomixer/document` as a repo-linked public package and pushed `latest` (multi-arch amd64/arm64,
  verified via `docker manifest inspect`). The earlier manual WSL push (digest `sha256:9cb479…`) was deleted
  along with the stale user-owned package.
- If a future push fails again, first check the two items above (repo workflow perms + package ownership), and
  only fall back to manual WSL rebuild+push (needs `docker login ghcr.io` with a classic PAT `write:packages`).
- The stale pre-rebrand versions were cleaned up via the GHCR API (135 old versions deleted; `delete:packages`
  scope is required on the PAT to delete, `write:packages` alone returns 403).
- `docker-compose.yaml` references `ghcr.io/anomixer/document:latest` (was `ranuts`); the readme `docker run`
  examples use the same image.

## Vendor app.js: missing-locale-caption crash (any locale, all editors)

**Symptom (reproduced 2026-08-20, v9 vendor):** opening any document under **zh-TW / zh**
greyed out the entire toolbar, blanked the page, and popped
"在處理文檔期間發生錯誤 / 用『下載為』備份" (= the `EditingError` dialog). Word/Excel/PPT all
affected. **English was unaffected** (its string table is complete), which is why an EN-only test
suite never caught it.

**Root cause:** the button-caption setter in the vendored `app.js` ends with
`.attr("aria-label", "string"==typeof t?t:t[0])`. When a caption key is absent from the active
locale table (v9 added feature strings the older zh tables lack — `en.json` has ~242/593/339 more
keys than `zh-tw.json` for word/excel/ppt), `t` is `undefined` and `t[0]` throws
`Cannot read properties of undefined (reading '0')`. The SDK escalates that to
`Asc.c_oAscError.ID.EditingError`, which calls `disableEditing(true)` + `api:disconnect` — the
whole editor dies. **One missing translation must not take down the entire editor.**

**Fix (app-side, NOT a vendor edit):** `bin/patch-vendor-robustness.js` rewrites the offending
expression to `"string"==typeof t?t:(t?t[0]:"")` (a missing caption degrades to a blank label).
It is idempotent and scans the whole `public/web-apps` tree, and `bin/build.sh` runs it before
`vite build`, so it survives a re-vendor. Do NOT "fix" this by filling the ~1100 missing zh-TW
strings — that is bottomless and would dump English into the Chinese UI; the guard is the correct
fix.

**Gotcha:** `bin/build-zh-tw.js` is dead code (v7-era; it crashes on v9 `app.js` because v9 lacks
its `define('.../locale/zh.json')` marker) and `app.zh-tw.js` is a **v7.4.1 leftover**. The v9
runtime uses `main/app.js` + the on-disk `locale/zh-tw.json`. Patching the on-disk `locale/*.json`
does nothing — the strings the crash reads come from the inline module in `app.js`.

## SynchronizeTip false positive on new Excel (co-authoring notice, serverless)

**Symptom (reproduced 2026-08-21):** opening a **new** Excel workbook showed a spurious
"SynchronizeTip" — zh-TW: "新增undefined 文件已被其他使用者更改。請按一下以保存您的更改並重新載入
更新。(Ctrl+S)" (EN: "The document has been changed by another user…"). The `undefined` is the
filename slot (empty because there is no server-side document). **Only Excel** hit it; Word/PPT did
not.

**Root cause:** on open, the SSE app's header checks `asc_getLocalRestrictions()` and, when it is
non-None, assumes a _peer_ holds the file and does `new Common.UI.SynchronizeTip({...})`. In this
serverless single-user editor there is no peer, so the tip is always a false positive that just
lures the user into a pointless save. (Confirmed the app's own `asc_setRestriction` is only used for
readonly mode and is `null` on a fresh editable workbook, so the trigger is the vendor's internal
state, not ours.)

**Fix (app-side guard #6 in `prepareEditorIframe`, `lib/onlyoffice-editor.ts`):** replace
`Common.UI.SynchronizeTip` with a no-op constructor returning a Proxy that swallows any method the
vendor later calls on the instance (`.on`, `.show`, `.destroy`, …). Earlier a `{destroy(){}}` stub
crashed with `s.tip.on is not a function` — the vendor calls methods on the returned object, so
return a permissive Proxy, not a fixed-shape object. Verified the editor still edits and saves
(`asc_Save` → download stream intact) after suppression, so it is not masking a real lock.

## Desktop (Tauri) app: do NOT run a Service Worker in the webview

**Symptom (reproduced 2026-08-21, `document-desktop.exe`):** the desktop app intermittently opened
to a blank window and never mounted the editor (no toolbar) — some launches fine, some black. That
intermittence is the tell.

**Root cause:** `index.ts` registered the **web** Service Worker (`sw.js`, PWA offline cache)
unconditionally. In the Tauri webview it runs on the `tauri.localhost` protocol, where it is
flaky: `Failed to update a ServiceWorker … An unknown error occurred`, and once it controls the
page it can intercept asset requests and serve the SPA shell instead of the real editor assets
(`web-apps/…`, `x2t.wasm.gz`) — so `DocEditor` builds but the **editor iframe is never created**
(`iframes: []`). Reproduced by attaching to the real exe over CDP
(`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=…` + Playwright
`connectOverCDP`).

**Fix (`index.ts`):** the desktop app is served from its embedded local files and is already fully
offline, so it does not need a SW. Detect desktop via
`isDesktopApp = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window ||
/tauri/i.test(location.host))`; on desktop, `navigator.serviceWorker.getRegistrations().forEach
(unregister)` instead of `register('./sw.js')`. `__TAURI_INTERNALS__` is Tauri's injected IPC
bridge (absent on the web host), so the web path keeps its SW for PWA + offline. Regression:
`test/e2e/desktop-sw-gate.spec.ts`.

**Two Service Workers — don't conflate them:** `sw.js` is ours (PWA) and is the culprit; the OnlyOffice
vendor editor `index.html` also registers `document_editor_service_worker.js` (a resource preloader) —
that one is harmless and coexists with a working editor.

**Also (local dev):** `tsconfig.json` excludes `src-tauri/**`. `tauri build` generates codegen `.ts`
artifacts under `src-tauri/target`, and the `**/*.ts` include was pulling them into `tsc --noEmit`
(spurious errors). `src-tauri` has no first-party TS, so excluding the dir is safe.

## Desktop (Tauri) app: build & ship

The native Windows app lives in `src-tauri/` (Tauri v2, `tauri-cli` via npx). It wraps the **same
web app** in a WebView2 webview, so any web-side fix (like the two above) is automatically in the
exe — but the web assets must be in a fresh `dist`.

```bash
pnpm build                          # fresh dist (bin/build.sh: vendor patches + vite + SW timestamp)
cd src-tauri && npx @tauri-apps/cli build
```

- **`beforeBuildCommand` runs `vite build`** (not `pnpm build`), so the vendor patches from
  `bin/patch-vendor-robustness.js` etc. are applied by that build step, not by a separate `pnpm build`
  — keep the two in sync if you add a new patch step.
- **Output:** `src-tauri/target/release/document-desktop.exe` (standalone) +
  `bundle/nsis/document-desktop_<ver>_x64-setup.exe` (NSIS installer) + a `.msi`. The `<ver>` is
  `tauri.conf.json` → `version` (currently `0.0.5`).
- **Verification loop (no GUI):** launch the exe with
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9410"` and drive it with Playwright
  `chromium.connectOverCDP('http://127.0.0.1:9410')` — open a document, assert the editor iframe is
  present with a populated toolbar, and read `navigator.serviceWorker.getRegistrations()`. This is how
  the black-screen regression is caught. Kill stray `document-desktop.exe`/`msedgewebview2.exe`
  between runs.
- **Release:** the `v0.0.5` GitHub tag is repointed to the build commit; the old v7
  `document-desktop.zip` was removed and the fixed `document-desktop.exe` + setup exe uploaded over
  the existing v0.0.5 release. See `docs/explorations/2026-08-21-desktop-blackscreen-service-worker.md`.
