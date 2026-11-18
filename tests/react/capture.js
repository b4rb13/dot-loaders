window.fixtureEvents = [];
window.fixtureErrors = [];
window.fixtureRefs = [];
window.fixtureFlags = {};
window.fixtureViolations = [];
window.fixtureShifts = [];
document.addEventListener('securitypolicyviolation', (e) =>
  window.fixtureViolations.push(e.violatedDirective),
);
if (PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      window.fixtureShifts.push({
        value: e.value,
        startTime: e.startTime,
        hadRecentInput: e.hadRecentInput,
      });
  }).observe({ type: 'layout-shift', buffered: true });
