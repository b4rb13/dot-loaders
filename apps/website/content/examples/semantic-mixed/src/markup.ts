import type { ChartVariant } from '@dotquilt-internal/core/chart';
import { chartGeometry, reportRows, rowName } from './data';
export const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char,
  );
export function chartMarkup(variant: ChartVariant) {
  const input = chartGeometry({ width: 320, height: 150 }, variant);
  return input.kind === 'line'
    ? `<path d="${input.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`
    : input.kind === 'bar'
      ? input.bars
          .map(
            (b) =>
              `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="currentColor"/>`,
          )
          .join('')
      : input.points
          .map(
            (p) =>
              `<circle cx="${p.x}" cy="${p.y}" r="3" fill="currentColor"/>`,
          )
          .join('');
}
export function rowsMarkup(international = false) {
  return reportRows
    .map(
      (row, index) =>
        `<tr data-row-id="report-${row.id}"><th scope="row"><span data-cell-text>${escapeHTML(rowName(index, international))}</span></th><td><span data-cell-text>${row.status}</span></td><td><span data-cell-text>${row.value}</span></td></tr>`,
    )
    .join('');
}
export function controls() {
  return `<fieldset><legend>Application actions</legend>${[
    ['load', 'Load report'],
    ['refresh', 'Refresh report'],
    ['reveal', 'Reveal report'],
    ['detail-load', 'Load detail'],
    ['detail-ready', 'Reveal detail'],
    ['measure', 'Refresh geometry'],
    ['recycle', 'Recycle table rows'],
    ['pause', 'Pause motion'],
  ]
    .map(
      ([id, label]) =>
        `<button id="${id}" type="button" disabled>${label}</button>`,
    )
    .join('')}
<label>Chart geometry<select id="variant" disabled><option>line</option><option>bar</option><option>scatter</option></select></label>
<label>Provider case<select id="mode" disabled>${['valid', 'retry', 'unavailable', 'invalid', 'throw', 'missing-row', 'international'].map((value) => `<option>${value}</option>`).join('')}</select></label>
<label><input id="override" type="checkbox" disabled>Use explicit region handoff</label></fieldset>`;
}
export function content() {
  return `<div class="report-content"><div class="report-head"><label for="note">Retained report note</label><input id="note" value="Keep my note"></div><div class="rich-grid"><figure class="chart-region"><svg id="report-chart" viewBox="0 0 320 150" preserveAspectRatio="none" role="img" aria-label="Illustrative usage trend">${chartMarkup('line')}</svg><figcaption>Illustrative usage samples: 20%, 45%, 36%, 75%, 62%, 92%.</figcaption></figure><table id="report-table"><caption>Illustrative project status</caption><thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Items</th></tr></thead><tbody>${rowsMarkup()}</tbody></table></div><p>Independent detail: <dotquilt-text-loader id="detail-owner" state="ready">Report detail available</dotquilt-text-loader></p></div>`;
}
export function placeholder() {
  return `<div class="report-placeholder" slot="placeholder" aria-hidden="true" inert><div class="report-head"><dotquilt-skeleton-block id="heading-source"></dotquilt-skeleton-block></div><div class="rich-grid"><div class="chart-region"><dotquilt-chart-loader id="chart-source" class="chart-box"></dotquilt-chart-loader></div><dotquilt-table-loader id="table-source" class="table-box" rows="3" row-height="36"></dotquilt-table-loader></div></div><dotquilt-typing-dots id="refresh-source" slot="refresh-indicator" aria-hidden="true"></dotquilt-typing-dots>`;
}
export function appMarkup() {
  return `${controls()}<p id="request-status" role="status">Ready. Controls require successful enhancement.</p><dotquilt-region id="report-owner" state="ready">${placeholder()}${content()}</dotquilt-region>`;
}
