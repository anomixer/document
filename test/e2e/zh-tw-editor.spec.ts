import { test, expect } from '@playwright/test';

function extractEditorText(page: import('@playwright/test').Page): Promise<string> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(async () => {
      const frame = page
        .frames()
        .find(
          (f) =>
            f.url().includes('documenteditor') ||
            f.url().includes('spreadsheeteditor') ||
            f.url().includes('presentationeditor'),
        );
      if (frame) {
        try {
          const text: string = (await frame.evaluate(() => document.body.innerText)) || '';
          if (text.length > 100) {
            clearInterval(iv);
            resolve(text);
            return;
          }
        } catch {
          /* frame not ready */
        }
      }
      if (Date.now() - t0 > 40000) {
        clearInterval(iv);
        resolve('');
      }
    }, 1500);
  });
}

test.describe('zh-TW editor bundles', () => {
  test('documenteditor: zh-TW shows Traditional, zh-CN Simplified, en English', async ({ page }) => {
    await page.route('**/sw.js', (r) => r.abort());

    await page.goto('/?locale=zh-TW&new=docx');
    const tw = await extractEditorText(page);
    console.log('zh-TW docx:', JSON.stringify(tw.slice(0, 200)));
    await page.goto('/?locale=zh-CN&new=docx');
    const cn = await extractEditorText(page);
    console.log('zh-CN docx:', JSON.stringify(cn.slice(0, 200)));
    await page.goto('/?locale=en&new=docx');
    const en = await extractEditorText(page);
    console.log('en docx:', JSON.stringify(en.slice(0, 200)));

    expect(/檔案/.test(tw) && /共同編輯/.test(tw)).toBe(true);
    expect(/文件/.test(cn) && /协作/.test(cn)).toBe(true);
    expect(/File|Insert|Home/.test(en)).toBe(true);
  });

  test('zh-TW does NOT crash the editor when a locale caption is missing', async ({ page }) => {
    // Regression (2026-08-20): a caption key absent from the zh-TW table made
    // app.js throw `Cannot read properties of undefined (reading '0')` inside
    // setCaption, which surfaced as EditingError -> disableEditing(true) -> a
    // blank page, a fully-greyed toolbar, and the "An error occurred during the
    // work with the document / use DownloadAs to back up" dialog. English was
    // unaffected (its table is complete), so the older locale-content tests
    // above never caught it. Assert the editor stays functional under zh-TW.
    await page.route('**/sw.js', (r) => r.abort());

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/?locale=zh-TW&new=docx');
    // The toolbar and the error dialog live inside the editor iframe, not the
    // top page, so probe the editor frame directly (same-origin, /web-apps/).
    // Find it by frame URL — the reliable signal (the iframe's .src attribute
    // is not set the way the URL reflects it).
    let editorFrame: import('@playwright/test').Frame | undefined;
    for (let i = 0; i < 40 && !editorFrame; i++) {
      editorFrame = page
        .frames()
        .find(
          (f) =>
            f.url().includes('documenteditor') ||
            f.url().includes('spreadsheeteditor') ||
            f.url().includes('presentationeditor'),
        );
      if (!editorFrame) await page.waitForTimeout(1000);
    }
    expect(editorFrame, 'editor iframe never mounted').toBeTruthy();
    await page.waitForTimeout(6000);

    const probe = await editorFrame!.evaluate(() => {
      const bodyText = document.body.innerText || '';
      const dialogVisible = /處理文檔期間發生錯誤|处理文档期间发生错误/.test(bodyText);
      // A crashed editor (EditingError -> disableEditing) disables the
      // overwhelming majority of toolbar buttons; a healthy one keeps most on.
      const buttons = Array.from(document.querySelectorAll('.asc_button, button, [role=button]'));
      const isOff = (el: Element) =>
        el.getAttribute('aria-disabled') === 'true' ||
        el.classList.contains('asc_button_disabled') ||
        /disabled|_disabled/.test(el.className);
      const enabled = buttons.filter((b) => !isOff(b)).length;
      const disabled = buttons.filter((b) => isOff(b)).length;
      return { dialogVisible, enabled, disabled, total: buttons.length };
    });

    // The editor must actually be present and rendering a toolbar.
    expect(probe.total).toBeGreaterThan(20);
    // The fatal "error during document processing" dialog must not be present.
    expect(probe.dialogVisible).toBe(false);
    // The editor must be usable: more buttons enabled than disabled.
    expect(probe.enabled).toBeGreaterThan(probe.disabled);
    // The specific undefined-caption crash must not have been thrown.
    expect(
      consoleErrors.some((e) => /Cannot read properties of undefined \(reading '0'\)/.test(e)),
    ).toBe(false);
  });

  test('spreadsheeteditor zh-TW shows Traditional', async ({ page }) => {
    await page.route('**/sw.js', (r) => r.abort());
    await page.goto('/?locale=zh-TW&new=xlsx');
    const text = await extractEditorText(page);
    console.log('zh-TW xlsx:', JSON.stringify(text.slice(0, 160)));
    expect(/檔案/.test(text)).toBe(true);
  });

  test('presentationeditor zh-TW shows Traditional', async ({ page }) => {
    await page.route('**/sw.js', (r) => r.abort());
    await page.goto('/?locale=zh-TW&new=pptx');
    const text = await extractEditorText(page);
    console.log('zh-TW pptx:', JSON.stringify(text.slice(0, 160)));
    expect(/檔案/.test(text)).toBe(true);
  });
});
