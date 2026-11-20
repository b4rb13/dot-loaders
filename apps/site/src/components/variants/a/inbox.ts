/**
 * The support inbox: the conversation loads on arrival; each message the
 * visitor sends gets a reply, held by typing dots until it arrives.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { fallbackReplies, quickReplies } from './data';
import { arriveOnce, jitter, reducedMotion, wait } from './lib';

export function startInbox() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-inbox]');
  if (!section) return;
  const region = section.querySelector<LoadingRegion>('[data-thread-region]');
  const scroller = section.querySelector<HTMLElement>('[data-thread]');
  const later = section.querySelector<HTMLElement>('[data-later]');
  const form = section.querySelector<HTMLFormElement>('[data-composer]');
  const input = form?.querySelector('input');
  const status = section.querySelector<HTMLElement>('[data-status]');
  const preview = section.querySelector<HTMLElement>('[data-preview]');
  if (!region || !scroller || !later || !form || !input || !status) return;

  // The conversation loads when the section arrives.
  const arrives = arriveOnce(section, () => {
    if (!arrives) return;
    setTimeout(() => region.update({ state: 'ready' }), jitter(1300));
  });
  if (arrives) region.update({ state: 'pending' });

  let minute = 43;
  let fallback = 0;
  let queue = Promise.resolve();
  const time = () => `10:${String(minute++ % 60).padStart(2, '0')}`;
  const settle = () =>
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });

  function bubble(text: string) {
    const box = document.createElement('div');
    box.className = 'va-bubble';
    const p = document.createElement('p');
    p.textContent = text;
    const stamp = document.createElement('time');
    stamp.textContent = time();
    box.append(p, stamp);
    return box;
  }

  function avatar() {
    const span = document.createElement('span');
    span.className = 'va-avatar';
    span.textContent = 'IC';
    return span;
  }

  /** Your message: it is yours, so it appears at once. */
  function send(text: string) {
    const message = document.createElement('div');
    message.className = 'va-msg you';
    if (!reducedMotion()) message.setAttribute('data-new', '');
    message.append(bubble(text));
    later?.append(message);
    settle();
    const answer =
      quickReplies.find((q) => q.send === text)?.reply ??
      fallbackReplies[fallback++ % fallbackReplies.length] ??
      'Thanks!';
    // Replies come one at a time, in order.
    queue = queue.then(() => reply(answer));
  }

  /** Their reply: typing dots in the bubble, then the words. */
  async function reply(text: string) {
    await wait(jitter(520));
    const message = document.createElement('div');
    message.className = 'va-msg them';
    const loading = document.createElement('dotquilt-region');
    loading.setAttribute('aria-label', 'Reply from Inês Costa');
    loading.setAttribute('state', 'pending');
    const placeholder = document.createElement('div');
    placeholder.slot = 'placeholder';
    placeholder.className = 'va-bubble typing';
    placeholder.append(document.createElement('dotquilt-typing-dots'));
    loading.append(placeholder, bubble(text));
    message.append(avatar(), loading);
    later?.append(message);
    if (status) status.textContent = 'Inês Costa is typing…';
    settle();
    // Longer replies take a little longer to write.
    await wait(Math.min(2600, jitter(1100 + text.length * 22)));
    (loading as LoadingRegion).update({ state: 'ready' });
    if (status) status.textContent = 'Inês Costa replied.';
    if (preview) preview.textContent = text;
    // Follow the bubble as it grows into the message.
    setTimeout(settle, 450);
    await wait(900);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    input.value = '';
    send(text);
  });
  for (const chip of section.querySelectorAll<HTMLButtonElement>(
    '[data-quick]',
  ))
    chip.addEventListener('click', () => send(chip.dataset.quick ?? ''));
}
