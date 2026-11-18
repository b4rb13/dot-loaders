window.beforeInput = document.getElementById('preserved-input');
window.beforeRects = Object.fromEntries(
  ['before', 'react-region', 'after'].map((id) => {
    const r = document.getElementById(id)?.getBoundingClientRect();
    return [
      id,
      r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
    ];
  }),
);

window.catalogBefore = Object.fromEntries(
  [
    ...document.querySelectorAll(
      '[id^="catalog-"], [id^="owner-"], [id^="input-"]',
    ),
  ].map((el) => [el.id, el]),
);
