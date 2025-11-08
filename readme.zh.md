# OnlyOffice Web

🌐 **線上體驗**: https://anomixer.github.io/document/

[English](readme.md) | [中文](readme.zh.md)

基於 OnlyOffice 的本地網頁文件編輯器，讓您直接在瀏覽器中編輯文件，無需伺服器端處理，保護您的隱私安全。

## ✨ 主要特性

- 🔒 **隱私優先**: 所有文件處理都在瀏覽器本地進行，不上傳到任何伺服器
- 📝 **多格式支援**: 支援 DOCX、XLSX、PPTX 等多種文件格式
- ⚡ **即時編輯**: 提供流暢的即時文件編輯體驗
- 🚀 **無需部署**: 純前端實現，無需伺服器端處理
- 🎯 **即開即用**: 開啟網頁即可開始編輯文件

## 🛠️ 技術架構

本專案基於以下核心技術構建：

- **OnlyOffice SDK**: 提供強大的文件編輯能力
- **WebAssembly**: 透過 x2t-wasm 實現文件格式轉換
- **純前端架構**: 所有功能都在瀏覽器中執行

## 📖 使用方法

### 基本使用

1. 訪問 [線上編輯器](https://anomixer.github.io/document/)
2. 上傳您的文件檔案
3. 直接在瀏覽器中編輯
4. 下載編輯後的文件

### 作為元件庫使用

本專案同時為 [@ranui/preview](https://www.npmjs.com/package/@ranui/preview) WebComponent 元件庫提供文件預覽元件的基礎服務支援。

📚 **預覽元件文件**: [https://chaxus.github.io/ran/src/ranui/preview/](https://chaxus.github.io/ran/src/ranui/preview/)

## 🚀 部署說明

- **自動部署**: 當代碼推送到主分支時，專案會自動部署到 GitHub Pages
- **手動部署**: 您也可以將專案部署到任何靜態網站託管服務

### docker run

``` bash
docker run -d --name document -p 8080:8080 ghcr.io/ranui/document:latest
```

### docker compose

```yaml
services:
  document:
    image: ghcr.io/ranui/document:latest
    container_name: document
    ports:
      - 8080:8080
```

## 🔧 本地開發

```bash
# 克隆專案
git clone https://github.com/ranuts/document.git

# 進入專案目錄
cd document

# 安裝依賴
npm install
# 啟動本地開發伺服器
npm run dev
```

## 📚 參考資料

- [onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) - 基於 WebAssembly 的文件轉換器
- [se-office](https://github.com/Qihoo360/se-office) - 安全文件編輯器
- [web-apps](https://github.com/ONLYOFFICE/web-apps) - OnlyOffice 網頁應用
- [sdkjs](https://github.com/ONLYOFFICE/sdkjs) - OnlyOffice JavaScript SDK
- [onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) - 本地網頁版 OnlyOffice 實現

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來幫助改進這個專案！

## 📄 許可證

詳情請參閱 [LICENSE](LICENSE) 檔案。
