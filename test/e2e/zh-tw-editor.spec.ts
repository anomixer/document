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
