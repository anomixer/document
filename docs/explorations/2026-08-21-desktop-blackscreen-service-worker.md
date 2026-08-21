# Desktop app black screen — a Service Worker running inside the Tauri webview

> 2026-08-21 · v0.0.5

## Symptom

The Tauri desktop app intermittently opened to a **blank window and never
mounted the editor**. Some launches were fine, others were a black/empty page
with no toolbar — which is what made it look random and hard to reproduce.

## What is NOT the cause

- Not the two v9 migration bugs fixed this round (locale-caption crash, false
  co-authoring tip) — those were already fixed and verified separately.
- Not the web app: the exact same `?new=xlsx` path in a normal browser renders
  the editor reliably (265 buttons, all guards installed, "文件載入完成").

## Root cause

The app registers a **web Service Worker** (`sw.js`, for PWA offline caching)
unconditionally in `index.ts`. In the desktop build that worker runs inside the
**WebView2 webview** on the `tauri.localhost` protocol, where it is flaky:

1. `Failed to update a ServiceWorker for scope ('http://tauri.localhost/') with
script ('http://tauri.localhost/sw.js'): An unknown error occurred` — seen
   in the failing runs.
2. Once it is controlling the page it **intercepts asset requests** and can
   serve the SPA shell (`index.html`) instead of the real editor assets
   (`web-apps/…`, `x2t.wasm.gz`). The editor's `DocEditor` then builds but the
   editor **iframe is never created** (`iframes: []`, only "Creating new editor
   instance" in the log) → blank page.

Reproduced by attaching to the real exe over CDP
(`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=…` + Playwright
`connectOverCDP`) and opening a document: one run had **no** editor iframe
(black), the next run had one — confirming the intermittent, SW-driven nature.

**Two different Service Workers — don't conflate them:**

| Worker                              | Registered by                         | Role                 | On desktop                                                                              |
| ----------------------------------- | ------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `sw.js`                             | `index.ts` (our code)                 | PWA offline cache    | **should not run** — the desktop app is already served locally and is offline by design |
| `document_editor_service_worker.js` | OnlyOffice vendor editor `index.html` | vendor asset preload | harmless, coexists with a working editor                                                |

The black screen was the **first** one.

## Fix

The desktop app is served from its embedded local filesystem and is already
fully offline, so a Service Worker adds nothing but a failure layer. On the
desktop webview we now **skip SW registration and unregister any one a previous
build left** in the webview's data dir. The web deployment keeps its SW for
PWA + offline.

- `index.ts`: `isDesktopApp = typeof window !== 'undefined' &&
('__TAURI_INTERNALS__' in window || /tauri/i.test(location.host))`; when true,
  `navigator.serviceWorker.getRegistrations().forEach(unregister)` instead of
  `register('./sw.js')`. `__TAURI_INTERNALS__` is Tauri's injected IPC bridge
  (absent on the web host `pages.dev`/`localhost`), so the web path is
  unaffected.
- `test/e2e/desktop-sw-gate.spec.ts`: regression — injects
  `__TAURI_INTERNALS__` before load and asserts **no** SW is registered and the
  landing still renders (fails without the fix).
- `tsconfig.json`: `src-tauri/**` added to `exclude` — `tauri build` generates
  codegen `.ts`/`.d.ts` build artifacts under `src-tauri/target`, and the
  `**/*.ts` include was pulling them into `tsc --noEmit` (spurious errors).
  `src-tauri` has no first-party TS, so excluding the whole dir is safe.

## Verification

- `desktop-sw-gate.spec.ts` passes.
- New exe (rebuilt): **3 consecutive fresh launches** each opening Excel →
  editor renders (265 buttons, no fatal dialog).
- SW state in the webview after the fix: `sw.js` **not registered** (and any
  leftover is cleared); the vendor preload worker is optional/harmless.

## Release

Shipped as **v0.0.5** (the `v0.0.5` tag was repointed from the old v7-engine
exe to this build; the old `document-desktop.zip` asset was removed and the
fixed `document-desktop.exe` + `document-desktop_0.0.5_x64-setup.exe` uploaded).
`tauri.conf.json` version set to `0.0.5`.
