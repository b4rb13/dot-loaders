window.nextViolations = [];
window.nextFirstInput = null;
window.nextFirstHost = null;
window.nextShifts = [];
document.addEventListener('securitypolicyviolation', (e) =>
  window.nextViolations.push({
    directive: e.violatedDirective,
    blocked: e.blockedURI,
  }),
);
const inputObserver = new MutationObserver(() => {
  window.nextFirstInput ??= document.getElementById('next-input');
  window.nextFirstHost ??= document.getElementById('next-region');
  if (window.nextFirstInput && window.nextFirstHost) inputObserver.disconnect();
});
inputObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
if (PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      window.nextShifts.push({
        value: e.value,
        hadRecentInput: e.hadRecentInput,
      });
  }).observe({ type: 'layout-shift', buffered: true });
window.nextCatalogBefore = {};
const catalogObserver = new MutationObserver(() => {
  for (const node of document.querySelectorAll(
    '[id^="catalog-"][data-dotquilt-surface], #catalog-text, [id^="owner-"], [id^="input-"]',
  ))
    window.nextCatalogBefore[node.id] ??= node;
});
catalogObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
