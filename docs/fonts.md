# Font Management

## Why fonts are not included

This project does not ship proprietary font files such as Arial, Times New Roman, Microsoft YaHei, or SimSun. These fonts are subject to copyright restrictions. Font name references remain in the configuration for document compatibility, but the actual files have been removed to comply with open-source licensing.

## Adding fonts

Font files go in `public/fonts/` and must be named by their numeric index in the `__fonts_files` array in `public/sdkjs/common/AllFonts.js`.

**Example: Adding Arial**

1. Open `AllFonts.js` and find the index for Arial regular — it is `223`
2. Place your font file at `public/fonts/223` (no extension)
3. The app loads it automatically when index `223` is requested

Other Arial variants:

| Variant     | Index | Path               |
| ----------- | ----- | ------------------ |
| Regular     | 223   | `public/fonts/223` |
| Italic      | 224   | `public/fonts/224` |
| Bold        | 226   | `public/fonts/226` |
| Bold Italic | 225   | `public/fonts/225` |

To find the index for any font, look up its entry in the `__fonts_infos` array in `AllFonts.js`.

> Only use open-source fonts or fonts you have a valid license for.

## PDF / print export (x2t) — CJK limitation

Fonts above drive **editor display** (Word/Excel/PPT rendering in the browser). The **PDF /
print-to-PDF path is different**: it is produced by the `x2t` converter (WASM), not the editor,
and it renders text against x2t's **own built-in font tables**.

- x2t's built-in table only covers the Western/Latin fonts (`DejaVuSans`, `LiberationSans`). It
  has **no CJK font** built in, and it only consults a `font_selection.bin` index plus the three
  Latin fonts in the font dir.
- Consequence: **Chinese / Japanese / Korean text does not render in PDF output** (it is dropped
  or garbled), even when CJK fonts (e.g. `NotoSans*`) are present in `public/fonts/`. Verified:
  open-source Noto → CJK missing; Noto renamed to "SimSun" → wrong glyphs; even the real
  Microsoft SimSun / Microsoft YaHei → still wrong. This is an x2t-engine limitation, not a code
  bug.
- The v9 branch (commit `1838cf298`) ships a real-SimSun/YaHei catalog + a `PDF_FONT_MANIFEST` +
  `font-catalog.mjs` (XOR wire format) + `m_nFormatTo=513` to address this, but its test only
  asserts the fonts are *written* to the WASM FS — it never renders the PDF to confirm CJK appears.
  So **upgrading to v9 is not yet a verified fix** for PDF-CJK.

See [2026-08-19-pdf-cjk-export-limitation.md](explorations/2026-08-19-pdf-cjk-export-limitation.md)
for the full investigation, the v7/v9 binary difference, and the follow-up plan (b1: build and
render v9 to confirm whether it actually produces CJK PDFs).
