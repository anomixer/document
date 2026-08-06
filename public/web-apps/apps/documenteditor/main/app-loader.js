/*!
 * Editor bootstrap loader.
 *
 * OnlyOffice's web-apps always load `app.js`, whose embedded Simplified Chinese
 * strings (the `define('<editor>/main/locale/zh.json', { ... })` module) are the
 * only source of UI text — the SDK never fetches the on-disk locale/*.json files.
 *
 * To surface Traditional Chinese we ship a second bundle, `app.zh-tw.js`, generated
 * from `app.js` by `bin/build-zh-tw.js` (opencc s2twp) with the embedded zh.json
 * module converted to Traditional. Both bundles are otherwise identical, so the
 * bootstrap still resolves `lang === 'zh' ? t : en` and applies the Traditional
 * module when this file picks `app.zh-tw`.
 *
 * This loader reads the frame's `lang` query param (set from `editorConfig.lang`
 * by the OnlyOffice API) and requires the matching bundle: `app.zh-tw` for
 * Traditional Chinese regions (zh-TW / zh-HK / zh-MO / zh-Hant), otherwise `app`.
 */
(function () {
  // Parse the frame query string (mirrors the SDK's getUrlParams()).
  function getUrlParams() {
    var params = {};
    var parts = window.location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (!pair[0]) continue;
      var name = decodeURIComponent(pair[0]);
      var value = pair.length > 1 ? decodeURIComponent(pair[1]) : '';
      params[name] = value;
    }
    return params;
  }

  var lang = (getUrlParams().lang || '').toLowerCase();
  var isTraditional = /^zh[-_]?(tw|hk|mo)$/.test(lang);

  require([isTraditional ? 'app.zh-tw' : 'app']);
})();
