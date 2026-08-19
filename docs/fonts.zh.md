# 字体管理

## 为什么不包含字体文件

本项目不包含 Arial、Times New Roman、微软雅黑、宋体等受版权保护的字体文件。这些字体名称的引用保留在配置文件中以确保文档兼容性，但实际字体文件已移除，以符合开源许可要求。

## 添加字体

字体文件放在 `public/fonts/` 目录下，文件名为 `public/sdkjs/common/AllFonts.js` 中 `__fonts_files` 数组的对应数字索引（无需扩展名）。

**示例：添加 Arial 字体**

1. 打开 `AllFonts.js`，找到 Arial 常规字体的索引 — 是 `223`
2. 将字体文件放置为 `public/fonts/223`
3. 应用程序引用索引 `223` 时会自动加载该文件

Arial 其他变体：

| 变体   | 索引 | 路径               |
| ------ | ---- | ------------------ |
| 常规   | 223  | `public/fonts/223` |
| 斜体   | 224  | `public/fonts/224` |
| 粗体   | 226  | `public/fonts/226` |
| 粗斜体 | 225  | `public/fonts/225` |

查找任意字体的索引，请查阅 `AllFonts.js` 中的 `__fonts_infos` 数组。

> 请仅使用开源字体或拥有合法授权的字体。

## PDF / 列印导出（x2t）—— 中文(CJK)限制

上面这些字体是**编辑器显示**（Word/Excel/PPT 在浏览器里渲染）用的。**PDF / 列印成 PDF 走的是另一條路**：由 `x2t` 转换器（WASM）产出，不是编辑器，它照 **x2t 内建的字形表**渲染。

- x2t 内建表只有西文/拉丁字体（`DejaVuSans`、`LiberationSans`），**没有任何 CJK 字体**，而且它只查 `font_selection.bin` 索引加那三个拉丁字体。
- 结果：**PDF 输出里的中/日/韩文字不显示**（缺字或乱码），即使 `public/fonts/` 里有 CJK 字体（如 `NotoSans*`）。已实测：开源 Noto → 中文全缺；Noto 化名成 "SimSun" → 乱码字；连真正的微软 SimSun / 微软雅黑 → 仍乱码。这是 x2t 引擎限制，不是 code bug。
- v9 分支（commit `1838cf298`）用**不同的 x2t binary**（9.86 MB）+ 267 字型 catalog（真 SimSun/微软雅黑/Droid Sans Fallback）+ `PDF_FONT_MANIFEST` + `m_nFormatTo=513`。**已實測驗證（2026-08-19，build v9 並渲染 PDF）：能產出正確 CJK PDF**——繁體+簡體、SimSun/雅黑/黑體/楷體皆正確，PDF 內嵌真實 CJK 子集（`BAAAAA+SimSun`、`FAAAAA+SimHei`…）且無 base-14 回退。v7 的舊 binary 做不到，**不能靠把字型/清單 backport 回 v7 解決**——必須整套 v9（binary + catalog + manifest）齊全。

详见 [2026-08-19-pdf-cjk-export-limitation.md](explorations/2026-08-19-pdf-cjk-export-limitation.md)（完整调查、b1 验证、v7→v9 决策）。
