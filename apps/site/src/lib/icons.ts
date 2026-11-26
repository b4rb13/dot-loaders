import { Resvg } from '@resvg/resvg-js';
import favicon from '../../public/favicon.svg?raw';

/**
 * The site icon as PNG and ICO, rendered at build time from
 * public/favicon.svg, so there is one drawing. Browsers use the SVG; these
 * are for what can't: Slack's and Google Chat's link previews, iOS home
 * screens and iMessage, and crawlers that ask for /favicon.ico.
 */

/** The icon as a PNG, `size` pixels square. */
export function iconPng(size: number, svg = favicon): Uint8Array<ArrayBuffer> {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  // A copy in a plain ArrayBuffer, which a Response body accepts.
  return new Uint8Array(png);
}

/**
 * The icon for iOS: square corners, since iOS rounds them itself and would
 * otherwise show the transparent corners as black.
 */
export const touchIcon = () =>
  iconPng(180, favicon.replace(/\s+rx="[^"]*"/, ''));

/**
 * A .ico holding the icon at 16, 32 and 48 pixels, each stored as a PNG
 * (allowed since Windows Vista, and read by every current browser).
 */
export function faviconIco(sizes = [16, 32, 48]): Uint8Array<ArrayBuffer> {
  const images = sizes.map((size) => ({ size, png: iconPng(size) }));
  const header = 6;
  const entry = 16;
  let offset = header + entry * images.length;
  const length =
    offset + images.reduce((total, { png }) => total + png.length, 0);
  const ico = new Uint8Array(length);
  const view = new DataView(ico.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  images.forEach(({ size, png }, index) => {
    const at = header + entry * index;
    view.setUint8(at, size); // width
    view.setUint8(at + 1, size); // height
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, png.length, true);
    view.setUint32(at + 12, offset, true);
    ico.set(png, offset);
    offset += png.length;
  });
  return ico;
}
