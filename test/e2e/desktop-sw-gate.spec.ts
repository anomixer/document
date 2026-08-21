import { expect, test } from './lib/l0';

// The Tauri desktop app is served from the embedded local filesystem, so it is
// already fully offline. A Service Worker on the tauri.localhost protocol adds
// nothing but a failure layer: it intermittently fails to update and can
// intercept asset requests (web-apps, x2t.wasm), leaving the editor unrendered
// (the reported "black screen"). The app must therefore NOT register a Service
// Worker when running in the desktop webview, while the web deployment keeps it
// for PWA + offline.
//
// Desktop is detected by the Tauri-injected __TAURI_INTERNALS__ global (and the
// tauri.localhost host). We simulate the webview by injecting that global before
// load; a real browser on a non-Tauri host never has it, so the web path is
// unaffected.
test('does not register a Service Worker in the desktop (Tauri) webview', async ({ page, context }) => {
  await context.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'load' });
  // Give any (mis)registration time to fire; registration happens on window load.
  await page.waitForTimeout(2500);

  const state = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return {
      isDesktop: '__TAURI_INTERNALS__' in window || /tauri/i.test(location.host),
      swRegistered: registrations.length > 0,
      controlled: !!navigator.serviceWorker.controller,
    };
  });

  // Sanity: we're actually in the simulated desktop environment.
  expect(state.isDesktop).toBe(true);
  // The fix: no Service Worker is registered or controlling the page on desktop.
  expect(state.swRegistered).toBe(false);
  expect(state.controlled).toBe(false);
  // And the landing page still renders (this is the user-visible "not black").
  await expect(page.locator('#app')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
