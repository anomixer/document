# OnlyOffice Web

<p align="center">
  <a href="https://github.com/anomixer/document/actions/workflows/ci.yml">
    <img src="https://github.com/anomixer/document/actions/workflows/ci.yml/badge.svg" alt="CI 狀態">
  </a>
  <a href="https://github.com/anomixer/document/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/anomixer/document" alt="授權">
  </a>
  <a href="https://github.com/anomixer/document/releases">
    <img src="https://img.shields.io/github/v/release/anomixer/document" alt="版本">
  </a>
  <a href="https://document26.pages.dev/">
    <img src="https://img.shields.io/badge/線上-體驗-brightgreen" alt="線上體驗">
  </a>
</p>

<p align="center">
  <a href="readme.md">English</a> | <a href="readme.zh.md">简体中文</a> | <b>繁體中文</b>
</p>

一個以隱私為優先、純瀏覽器執行的文件編輯器，由 OnlyOffice 驅動。直接在瀏覽器中編輯 DOCX、XLSX、PPTX、CSV 檔案——不需伺服器、不需上傳、不需註冊帳號。

---

## ✨ 主要特性

- 🔒 **隱私優先** — 所有處理都在本地完成，不上傳任何資料
- 📝 **多格式支援** — DOCX、XLSX、PPTX、CSV 等
- 🚀 **不需伺服器** — 純前端實作，可部署到任何靜態托管
- 🌐 **從 URL 開啟** — 透過 `?src=` 或 `?file=` 參數直接載入遠端文件
- 📦 **PWA 支援** — 可安裝、支援離線使用
- 🌍 **多語言** — 英文、简体中文、繁體中文，並自動偵測瀏覽器語系切換
- 🧩 **可嵌入** — 完整的 postMessage API 支援 iframe 整合

---

## ⚡ 與上游版本對比優勢 (`anomixer/document` vs Upstream)

| 功能 / 修復項目        | 上游原始版本 (`chaxus/document`)                     | 本 Fork 版本 (`anomixer/document`)                                     |
| :--------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------- |
| **語系自動偵測**       | ⚠️ 偏好切換易失效（選英文語系依然顯示簡中選單）      | 🌐 **智慧自動偵測**：無縫切換 `EN` / `zh-CN` / `zh-TW` 並保留 URL 參數 |
| **Word 英文模式**      | ❌ 點擊 File 選單崩潰白屏 (`TypeError: textContent`) | 🛠️ **完整修復**：補齊缺漏的英文翻譯 Key                                |
| **繁體中文 (`zh-TW`)** | ❌ 缺漏 / 不支援台灣地區設定                         | 🇹🇼 **完整支援**：OpenCC `s2twp` 自動轉譯與 `LCID 1028` (NT$)           |
| **桌面版應用**         | ❌ 僅支援網頁版                                      | 🖥️ **Tauri 桌面端**：支援 Windows 原生桌面執行檔 (`.exe`)              |

---

## 🚀 快速開始

**線上體驗：** [document26.pages.dev](https://document26.pages.dev/)

**Docker 執行：**

```bash
docker run -d --name document -p 8080:80 ghcr.io/anomixer/document:latest
```

然後用瀏覽器開啟 <http://localhost:8080>。

**本地開發：**

```bash
git clone https://github.com/anomixer/document.git
cd document
pnpm install
pnpm run dev
```

---

## 📖 使用方法

### 開啟文件

1. 點擊上傳按鈕選擇本地檔案，或
2. 透過 URL 參數傳入：`?src=https://example.com/document.docx`

> 遠端 URL 需支援 CORS。

### 介面語言

介面提供 **英文（en）**、**中文簡體（zh）** 和 **中文繁體（zh-TW）** 三種語言。

請先在首頁門戶選擇所需語言（語言切換器），然後開啟編輯器 — 該選擇會作用於目前編輯器以及隨後建立或開啟的任意文件（DOCX、XLSX、PPTX 等，透過 `?new=` 或 `?src=`）。也可透過 `locale` 參數強制指定：

- `?locale=en` → 英文
- `?locale=zh` → 中文（簡體）
- `?locale=zh-TW` → 中文（繁體）

顯式選擇會被保存在 `localStorage`，下次造訪時優先於瀏覽器語言。

### URL 參數

| 參數     | 說明                        | 優先級 |
| -------- | --------------------------- | ------ |
| `src`    | 從 URL 開啟文件（推薦）     | 低     |
| `file`   | 從 URL 開啟文件（向後相容） | 高     |
| `locale` | 設定介面語言（`en`、`zh`）  | —      |

同時提供 `src` 和 `file` 時，`file` 優先。

### 離線使用（PWA）

透過 HTTPS（或 localhost）存取編輯器，點擊網址列中的**安裝**圖示，安裝後便可在無網路環境下正常使用。

> Service Worker 在 `file://` 協定下無法運作，請使用本地伺服器或已安裝的 PWA。

### 作為元件庫使用

本專案為 [@ranui/preview](https://www.npmjs.com/package/@ranui/preview) WebComponent 元件庫提供文件預覽能力。

📚 [預覽元件文件](https://chaxus.github.io/ran/src/ranui/preview/)

---

## 🧩 iframe 嵌入

把編輯器嵌入到你的應用中，並用 postMessage 控制。建議架構：父系統負責驗證與檔案上傳，iframe 只負責編輯。

```html
<iframe
  id="documentEditor"
  src="https://document26.pages.dev/?embed=1"
  style="width: 100%; height: 720px; border: 0"
></iframe>
```

```js
// 開啟文件
iframe.contentWindow.postMessage(
  { id: '1', type: 'document:open-url', payload: { url: 'https://example.com/doc.xlsx' } },
  'https://document26.pages.dev',
);

// 監聽結果
window.addEventListener('message', (e) => {
  if (e.data?.type === 'document:opened') console.log('可以開始編輯');
  if (e.data?.type === 'document:saved') uploadFile(e.data.payload.file);
});
```

→ **[完整 API 文件](docs/embed-api.zh.md)** — 所有訊息型別、參數說明及範例，包含驗證、唯讀模式、儲存流程等。

---

## 🚀 部署

這是純靜態應用，構建一次即可部署到任意平台。

```bash
pnpm build   # 輸出到 dist/
```

### Cloudflare Pages（目前正式部署）

本站目前使用 Cloudflare Pages，`git push main` 後自動建置並部署。設定步驟：

1. 登入 Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 選擇 GitHub 帳號與專案 `anomixer/document` → **Begin setup**
3. 建置設定：
   - **Project name**: `document26`（因此正式網址為 `document26.pages.dev`）
   - **Production branch**: `main`
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
4. **Save and Deploy** — Cloudflare 會自動執行 `pnpm install` 再建置
5. 完成後即可在 `https://document26.pages.dev/` 存取；亦可自行新增 Custom domain

之後每次 push `main` 皆會自動重建。

> 注意：`bin/build.sh` 是 Linux 專用腳本，本機若為 Windows，`pnpm build` 需在 Linux/CI 環境（例如 Cloudflare、GitHub Actions）執行。

### GitHub Pages 重定向

本仓库也保留一個 GitHub Pages 站點作為便捷重定向。它設定為從 `main` 分支的 `/docs` 文件夾提供服務，
其中的 `docs/index.html` 會透過 meta-refresh + canonical 链接跳转到真實站點
`https://document26.pages.dev/`。若 GitHub Pages 被意外重新指向 `main` 分支根目錄，則會出現 404
（根目錄的 `index.html` 是 Vite 原始碼殼，引用了 `main` 中不存在的建置資產）。正確配置方式：
Settings → Pages → Build and deployment → Source = **main branch / /docs folder**.

### 靜態托管（Nginx、Vercel、Netlify、其他 Cloudflare Pages 專案…）

將 `dist/` 目錄上傳到任何靜態托管服務，無需伺服器端執行。

Nginx 參考設定（將所有路由回退到 `index.html`）：

```nginx
location / {
  root /var/www/document;
  try_files $uri $uri/ /index.html;
}
```

### Docker

```bash
# 基礎部署
docker run -d --name document -p 8080:80 ghcr.io/anomixer/document:latest

# 啟用 HTTPS 與基礎認證
docker run -d --name document -p 443:443 \
  -v /憑證路徑:/ssl \
  -e SERVER_BASIC_AUTH='使用者:BCrypt加密密碼' \
  -e SERVER_HTTP2_TLS=true \
  -e SERVER_HTTP2_TLS_CERT=/ssl/cert.pem \
  -e SERVER_HTTP2_TLS_KEY=/ssl/key.pem \
  ghcr.io/anomixer/document:latest
```

`SERVER_BASIC_AUTH` 使用 BCrypt 加密密碼，加密結果中的 `$` 需替換為 `$$` 進行跳脫。

**本機建置映像**（若不拉取、想自行建置）：

```bash
docker build -t ghcr.io/anomixer/document:latest .
```

---

## 🔤 字型

本專案不包含 Arial、Times New Roman、微軟正黑體等受版權保護的字型檔，以符合開源授權要求。字型名稱參照會保留，以確保文件相容性。

→ **[字型管理指南](docs/fonts.zh.md)** — 如何依索引新增字型。

---

## 📚 參考資料

- [onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) — 以 WASM 為基礎的文件轉換器
- [web-apps](https://github.com/ONLYOFFICE/web-apps) — OnlyOffice 網頁應用
- [sdkjs](https://github.com/ONLYOFFICE/sdkjs) — OnlyOffice JavaScript SDK
- [se-office](https://github.com/Qihoo360/se-office) — 安全文件編輯器
- [onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) — 本地網頁版 OnlyOffice

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

[AGPL-3.0](LICENSE)
