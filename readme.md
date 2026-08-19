# OnlyOffice Web

<p align="center">
  <a href="https://github.com/anomixer/document/actions/workflows/ci.yml">
    <img src="https://github.com/anomixer/document/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/anomixer/document/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/anomixer/document" alt="License">
  </a>
  <a href="https://github.com/anomixer/document/releases">
    <img src="https://img.shields.io/github/v/release/anomixer/document" alt="Version">
  </a>
  <a href="https://document26.pages.dev/">
    <img src="https://img.shields.io/badge/Live-Demo-brightgreen" alt="Live Demo">
  </a>
</p>

<p align="center">
  <b>English</b> | <a href="readme.zh.md">简体中文</a> | <a href="readme.zh-tw.md">繁體中文</a>
</p>

A privacy-first, browser-based document editor powered by OnlyOffice. Edit DOCX, XLSX, PPTX, and CSV files directly in your browser — no server, no uploads, no account required.

---

## ✨ Features

- 🔒 **Privacy-first** — all processing happens locally, nothing is uploaded
- 📝 **Multi-format** — DOCX, XLSX, PPTX, CSV editing plus PDF opening, and more
- 🚀 **No server required** — pure frontend, deploy anywhere
- 🌐 **Open from URL** — load documents via `?src=` or `?file=` parameters
- 📦 **PWA support** — install and use offline
- 🌍 **Multi-language** — English, Chinese (Simplified), Chinese (Traditional) with smart auto-detection
- 🧩 **Embeddable** — full postMessage API for iframe integration

---

## ⚡ Improvements over Upstream (`anomixer/document` vs Upstream)

| Feature / Fix                     | Upstream (`chaxus/document`)                               | Our Fork (`anomixer/document`)                                                            |
| :-------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Locale Auto-Detection**         | ⚠️ Fallback issues (selecting EN still loads Chinese UI)   | 🌐 **Smart Auto-Detect**: Seamless `EN`, `zh-CN`, `zh-TW` switching preserving URL params |
| **Word English Mode**             | ❌ Crashes on opening File menu (`TypeError: textContent`) | 🛠️ **Fixed**: Restored missing English translation keys                                   |
| **Traditional Chinese (`zh-TW`)** | ❌ Omitted / Unsupported                                   | 🇹🇼 **Full Support**: OpenCC `s2twp` bundles & `LCID 1028` regional settings               |
| **Desktop Application**           | ❌ Web-only                                                | 🖥️ **Tauri App**: Native Windows desktop executable (`.exe`)                              |

---

## 🚀 Quick Start

**Try it online:** [document26.pages.dev](https://document26.pages.dev/)

**Run with Docker:**

```bash
docker run -d --name document -p 8080:80 ghcr.io/anomixer/document:latest
```

Then open a browser and visit <http://localhost:8080>.

**Run locally:**

```bash
git clone https://github.com/anomixer/document.git
cd document
pnpm install
pnpm run dev
```

---

## 📖 Usage

### Open a document

1. Click the upload button to open a local file, or
2. Pass a URL via query parameter: `?src=https://example.com/document.docx`

> Remote URLs must support CORS.

### Interface language

The UI is available in **English**, **Chinese (Simplified)**, and **Chinese (Traditional)**.

Pick your language on the homepage portal first (language switcher), then open an editor — the choice
sticks for that editor and for any file you create or open (DOCX, XLSX, PPTX, …) via `?new=` or `?src=`.
You can also force it with the `locale` parameter:

- `?locale=en` → English
- `?locale=zh` → Chinese (Simplified)
- `?locale=zh-TW` → Chinese (Traditional)

An explicit choice is saved in `localStorage` and preferred over the browser's locale on your next visit.

### URL parameters

| Parameter | Description                          | Priority |
| --------- | ------------------------------------ | -------- |
| `src`     | Open document from URL (recommended) | Low      |
| `file`    | Open document from URL (legacy)      | High     |
| `locale`  | Set interface language (`en`, `zh`)  | —        |

When both `src` and `file` are present, `file` takes priority.

### PWA offline usage

Visit the editor over HTTPS (or localhost), then click the **Install** icon in the address bar. Once installed, the editor works without an internet connection.

> Service Workers don't work over `file://`. Use a local server or the installed PWA.

### As a component library

This project powers the document preview component in [@ranui/preview](https://www.npmjs.com/package/@ranui/preview).

📚 [Preview component docs](https://chaxus.github.io/ran/src/ranui/preview/)

---

## 🧩 Embedding via iframe

Embed the editor in your application and control it via postMessage. The recommended pattern is: the parent system handles auth and file upload; the iframe handles editing only.

```html
<iframe
  id="documentEditor"
  src="https://your-deployment/?embed=1"
  style="width: 100%; height: 720px; border: 0"
></iframe>
```

```js
// Open a document
iframe.contentWindow.postMessage(
  { id: '1', type: 'document:open-url', payload: { url: 'https://example.com/doc.xlsx' } },
  'https://your-deployment',
);

// Listen for the result
window.addEventListener('message', (e) => {
  if (e.data?.type === 'document:opened') console.log('Ready to edit');
  if (e.data?.type === 'document:saved') uploadFile(e.data.payload.file);
});
```

→ **[Full API reference](docs/embed-api.md)** — all message types, options, and examples including auth, read-only mode, and save flow.

---

## 🚀 Deployment

This is a pure static app — build once, deploy anywhere.

```bash
pnpm build   # outputs to dist/
```

### Cloudflare Pages (current production)

This site deploys to Cloudflare Pages (`document26.pages.dev`) automatically on every push to `main`:

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Connect the `anomixer/document` GitHub repo → **Begin setup**
3. Build settings:
   - **Project name**: `document26` (hence the live URL `document26.pages.dev`)
   - **Production branch**: `main`
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
4. **Save and Deploy** — Cloudflare runs `pnpm install` then builds automatically.
5. Access it at `https://document26.pages.dev/`; you can add a custom domain too.

> Note: `bin/build.sh` is a Linux script — on a Windows machine run `pnpm build` inside a Linux/CI environment (Cloudflare or GitHub Actions).

### GitHub Pages redirect

This repo also keeps a GitHub Pages site as a convenience redirect. It is configured to serve the
`/docs` folder of the `main` branch, whose `docs/index.html` does a meta-refresh + canonical link to the
real site at `https://document26.pages.dev/`. If GitHub Pages were ever repointed at the `main` branch
root it would 404 (the root `index.html` is a Vite source shell that references built assets absent
from `main`). To point GH Pages correctly:
Settings → Pages → Build and deployment → Source = **GitHub Actions** / **`main` branch / `/docs`** folder.

### Static hosting (Nginx, Vercel, Netlify, other Cloudflare Pages projects…)

Upload the contents of `dist/` to any static host. No server-side runtime needed.

For Nginx, serve `index.html` as the fallback for all routes:

```nginx
location / {
  root /var/www/document;
  try_files $uri $uri/ /index.html;
}
```

### Docker

```bash
# Basic
docker run -d --name document -p 8080:80 ghcr.io/anomixer/document:latest

# With HTTPS and basic auth
docker run -d --name document -p 443:443 \
  -v /path/to/certs:/ssl \
  -e SERVER_BASIC_AUTH='user:$2y$...' \
  -e SERVER_HTTP2_TLS=true \
  -e SERVER_HTTP2_TLS_CERT=/ssl/cert.pem \
  -e SERVER_HTTP2_TLS_KEY=/ssl/key.pem \
  ghcr.io/anomixer/document:latest
```

`SERVER_BASIC_AUTH` uses BCrypt-hashed passwords. Replace `$` with `$$` in the hash for shell escaping.

**Build the image locally** (if you prefer to build instead of pulling):

```bash
docker build -t ghcr.io/anomixer/document:latest .
```

---

## 🔤 Fonts

The editor ships with the font library bundled in the vendored OnlyOffice build (`public/fonts/`, indexed by `public/sdkjs/common/AllFonts.js`). Fonts are fetched on demand — only the ones a document actually uses are downloaded.

→ **[Font management guide](docs/fonts.md)** — the indexed font catalog: wire format, registries, and how to add fonts with `bin/font-catalog.mjs`.

---

## 📚 References

- [onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) — WASM document converter
- [web-apps](https://github.com/ONLYOFFICE/web-apps) — OnlyOffice web applications
- [sdkjs](https://github.com/ONLYOFFICE/sdkjs) — OnlyOffice JavaScript SDK
- [se-office](https://github.com/Qihoo360/se-office) — Secure document editor
- [onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) — Local OnlyOffice implementation

## 🤝 Contributing

Issues and pull requests are welcome!

## 📄 License

[AGPL-3.0](LICENSE)
