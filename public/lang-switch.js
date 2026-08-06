// Shared language-switch wiring for the static pages (satellite pages, the
// zh-CN homepage and 404.html). Each page declares its targets on the options:
//
//   <r-select class="lang-select" type="text" value="en">
//     <r-option value="en" data-href="/open/docx">EN</r-option>
//     <r-option value="zh-CN" data-href="/zh-CN/open/docx">中文</r-option>
//   </r-select>
//
// The app homepage wires the same markup in index.ts instead (it maps locales
// itself); this file is only loaded by pages without the app bundle.
document.addEventListener('DOMContentLoaded', function () {
  var select = document.querySelector('r-select.lang-select');
  if (!select) return;
  select.addEventListener('change', function (event) {
    var value = event.detail && event.detail.value;
    if (!value) return;
    // Remember the explicit choice so the homepage auto-detect (index.html)
    // stops redirecting this visitor on their next visit.
    if (value === 'en' || value === 'zh-CN' || value === 'zh-TW') {
      try {
        localStorage.setItem('ran-lang', value);
      } catch (e) {}
    }
    var option = select.querySelector('r-option[value="' + value + '"]');
    var href = option && option.getAttribute('data-href');
    if (href && href !== location.pathname) location.href = href;
  });
});
