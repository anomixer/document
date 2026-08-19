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
4. **對 v7→v9 升級決策的影響**:「升 v9 就能解 PDF 中文」這個假設**尚未被可靠驗證**。升級前應先以 (b1) 的方式把 v9 真 build 起來、開真實 docx 存 PDF 渲染驗證,再決定。

## 後續

- **b2(本文)**:記錄限制、標記為已知問題、更新 fonts 文件指引。
- **b1(待做)**:在隔離環境 build v9 分支、瀏覽器實跑,確認 v9 到底能不能渲染 CJK PDF——這決定 v7→v9 升級是否值得為 #3 進行。

## 附:可複現的測試腳本

`tmp-probe/`(未入庫)含完整實測:`alias-exact.cjs`/`real-cjk-pdf.cjs`(x2t 轉 PDF 抓 blob)、`render.cjs`(用 pdf.js 把 PDF 渲染成圖)、`type-test.cjs`(編輯器打字)、`run-v9bin.cjs`(換 v9 binary 實測)。
