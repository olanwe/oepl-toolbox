/* Offline localization. German source text is the fallback; catalogs contain plain text only. */
(function (root) {
  'use strict';
  const supported = ['de', 'en'], storageKey = 'oepl-toolbox-language';
  const catalogs = root.ToolboxLocales || {};
  const baseLanguage = value => typeof value === 'string' ? value.toLowerCase().split(/[-_]/)[0] : '';
  function detect(languages, saved) {
    if (supported.includes(saved)) return saved;
    return (languages || []).map(baseLanguage).find(code => supported.includes(code)) || 'en';
  }
  let saved;
  try { saved = root.localStorage?.getItem(storageKey); } catch {}
  let language = detect(root.navigator?.languages || [root.navigator?.language], saved);
  function t(key, values = {}) {
    const text = language === 'de' ? key : (catalogs[language]?.[key] ?? key);
    return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function apply(container = root.document) {
    if (!container) return;
    container.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    for (const attr of ['title', 'placeholder', 'aria-label']) {
      container.querySelectorAll('[data-i18n-' + attr + ']').forEach(node => {
        node.setAttribute(attr, t(node.getAttribute('data-i18n-' + attr)));
      });
    }
    root.document.documentElement.lang = language;
    const help = root.document.querySelector('footer a');
    if (help) help.href = language === 'en' ? 'README.en.md' : 'README.md';
    const select = root.document.getElementById('language');
    if (select) select.value = language;
  }
  function setLanguage(code) {
    if (!supported.includes(code)) return false;
    const previous = language; language = code;
    try { root.localStorage?.setItem(storageKey, code); } catch {}
    apply();
    if (previous !== code) root.document?.dispatchEvent(new CustomEvent('languagechange', {detail: {language, previous}}));
    return true;
  }
  function option(key, value) {
    const node = new Option(t(key), value); node.dataset.i18n = key; return node;
  }
  const api = {t, apply, detect, setLanguage, option, supported,
    get language() { return language; },
    get locale() { return language === 'de' ? 'de-DE' : 'en-US'; },
    number(value, digits = 2) { return new Intl.NumberFormat(api.locale, {maximumFractionDigits: digits}).format(value); }
  };
  root.I18N = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (root.document) {
    apply();
    root.document.getElementById('language')?.addEventListener('change', event => setLanguage(event.target.value));
  }
})(globalThis);
