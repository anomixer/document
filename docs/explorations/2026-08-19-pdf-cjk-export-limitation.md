# x2t 轉 PDF 的中文(CJK)導出限制 —— 實測結論與 v7/v9 差異

> 2026-08-19

## 背景

用戶反饋「列印 / 存成 PDF 時中文字出不來」(#3)。調查目標:這是 code bug 可修,還是 x2t 引擎層的硬限制;以及它對 v7→v9 升級決策的影響。

同一批調查也確認了另外兩個字型問題**在當前 source 已修好**:

- **#1 Word 存檔字型/大小沒存對**:走真實存檔路徑存出的 DOCX,字型參照(SimSun / Microsoft YaHei / SimHei / DFKai-SB…)、大小(14pt/16pt)、中文文字**全部正確保留**。
- **#2 選其他中文字型打繁中錯位**:開多字型 CJK 檔、直接打繁中,在**當前 source** 上**全部正確顯示**。根因是 v7 引擎的字型替換表會 XHR 抓 `/fonts/<name>.ttf` 真字型——抓到就照字表渲染→錯位;抓不到就用內建字形→正確。`public/onlyoffice-v7-iframe-patch.js` 已把替換**限縮到只有 Excel**(`DISABLE_FONT_REMAP = pathname.indexOf('spreadsheeteditor') === -1`),所以 Word/Slide 讓請求失敗、走內建字形、正確。此修為 commit `924ffb8b5`(已在 main)。

**用戶看到 #1/#2 的錯位是跑了舊 build**(fix 之前的 dist);重 build + deploy 即正常。

## 調查方法

用 Playwright + headless Chromium 驅動真實 app,直接調 x2t(Emscripten,Node/browser 皆可)轉 PDF,再**把 PDF 實際渲染成圖片來看**中文有沒有出來——不是只看「有沒有崩」,而是看渲染結果。測試樣本為一份含 SimSun / 微軟雅黑 / 黑體 / 楷體 / Calibri / Times 的多字型 CJK 檔。

## 實測結果

x2t 轉 PDF 時只讀三樣:`font_selection.bin`(字型選取索引)與三個內建拉丁字型(DejaVuSans / DejaVuSans-Bold / LiberationSans-Regular)。它**照內建字表渲染**,並按別名檔名在 `m_sFontDir` 找字型;它**內建沒有任何 CJK 字型**。

| 組合 | PDF 渲染結果 |
|---|---|
| v7 x2t + 只放拉丁字型(當前 code) | **中文全缺** |
| v7 x2t + 開源 Noto 化名成 SimSun | **中文變亂碼字**(囂蟠讔静) |
| v7 x2t + **真微軟 SimSun / 微軟雅黑**(從 v9 catalog `public/fonts/016,017` 解出) | **仍是亂碼字** |
| v7 x2t + **v9 分支的 x2t binary** + v9 完整配方(真字型 + `PDF_FONT_MANIFEST` + `m_nFormatTo=513`) | **仍是亂碼字** |

## 結論

1. **#3 不是「放對字型檔」就能修的 code bug**。x2t 需要一份正確的 `font_selection.bin`(讓它知道「SimSun / 微軟雅黑 / 開源 CJK 這些字型可用」)才會正確渲染 CJK;光把 TTF 丟進 `m_sFontDir` 不夠——照內建字表渲染,開源 Noto 的字形順序與微軟 SimSun 不同,化名也對不上,結果就是缺字或亂碼。
2. **v7 與 v9 的 x2t binary 不同**(v7 `public/wasm/x2t/x2t.wasm.gz` 12 MB;v9 `public/sdkjs/common/wasm/x2t/` 9.86 MB,commit `1838cf298`)。v9 用「真 SimSun(017)/微軟雅黑(016)/Droid(130) + `PDF_FONT_MANIFEST` 別名清單 + `font-catalog.mjs`(XOR 線格式)+ `m_nFormatTo=513`」來做,但**本環境實測仍渲染不出正確中文**。
3. **v9 分支的 CJK-PDF「修復」未被其自身測試驗證**:`test/unit/document-converter.test.ts` 只斷言字型檔**被寫進** WASM FS(`writtenPaths.toContain('/working/fonts/SimSun.ttf')`),**從未有測試真的把 PDF 渲染出來確認中文出現**。因此 v9 那套可能是「字型載入」修補,而非「中文渲染」修補。
4. **對 v7→v9 升級決策的影響**:「升 v9 就能解 PDF 中文」——**已驗證成立**(見下 b1 結果)。v7 的舊 x2t binary 做不到,但 v9 的新 binary + 完整 catalog 可以。

## b1 實測結果(2026-08-19,隔離 worktree 真 build v9)

把 v9 分支(`ranuts_repo/main`,HEAD `71528f36d`)在隔離 worktree 完整 build + 瀏覽器實跑,開同一份多字型 CJK 檔、走真實存檔路徑存 PDF、再渲染驗證:

- **v9 PDF 內嵌真實 CJK 字型子集**:`BAAAAA+SimSun`、`CAAAAA+Droid`、`DAAAAA+Microsoft`(YaHei)、`FAAAAA+SimHei`、`GAAAAA+XiaoBiaoSong`,且**無 base-14(Helvetica/Times/Courier)回退**、有 `CIDFontType2` + `ToUnicode`。
- **渲染結果:繁中/簡中/多種字型全部正確**——「新宋體 traditional SimSun 12pt」「微軟正黑體 traditional YaHei 14pt」「黑體 simplified SimHei 黑体测试」「DFKai-SB 楷體 Kai 楷体」「Times New Roman 英文 serif 中文混排」「default font 預設字型 預設 默认 默认」,中英混排皆正確。

**結論:v9 解得了 #3。** 關鍵是 v9 用**不同的 x2t binary**(9.86 MB,`public/sdkjs/common/wasm/x2t/`)+ 267 字型 catalog(含真 SimSun/微軟雅黑/Droid)+ `PDF_FONT_MANIFEST` + `m_nFormatTo=513`。v7 的舊 binary(12 MB)做不到——單換 binary 或單放真字型都不夠,必須整套(v9 binary + catalog + manifest + 格式常數)齊全。

> 修正:本文早期「v9 未驗證」的說法不成立——v9 的**測試**確實只斷言字型寫進 WASM FS(未渲染),但**實跑 v9 確認 PDF 中文正確**,故 v9 是 #3 的可用解。

## 後續

- **b2(已完成)**:記錄 #3 為 v7 引擎限制、更新 fonts 文件指引、push(commit `8289da35b`)。
- **b1(已完成)**:build v9 + 實跑確認——**v9 能正確渲染 CJK PDF**。
- **決策**:若要修 #3,路徑是**升級到 v9**(v7→v9 monorepo,見 CLAUDE.md),不是把 v9 的片段 backport 回 v7(實測 v7 binary + 真字型 + 清單仍亂,因 v7 binary 的 PDF 字型管線不同)。

## 附:可複現的測試腳本

`tmp-probe/`(未入庫)含完整實測:`alias-exact.cjs`/`real-cjk-pdf.cjs`(x2t 轉 PDF 抓 blob)、`render*.cjs`(用 pdf.js 把 PDF 渲染成圖)、`type-test.cjs`(編輯器打字)、`run-v9bin.cjs`(換 v9 binary 實測)、`v9-realpdf.cjs`(v9 真實存檔路徑抓 PDF)、`render-static/`(無 SW 的乾淨渲染)。b1 渲染截圖 `V9-PDF-RENDER.png`。
