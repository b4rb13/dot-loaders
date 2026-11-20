/**
 * The support inbox: the conversation loads on arrival; each message the
 * visitor sends gets a reply, held by typing dots until it arrives.
 *
 * The hold control on the left is the network: pressing it sends the next
 * quick reply (or takes over a reply already being typed), and Inês keeps
 * typing for as long as it is held. Letting go delivers her answer.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { Connection } from './hold';
import { arriveOnce, jitter, reducedMotion, wait } from './lib';
import { fallbackReplies, quickReplies } from './screens';

/** A reply being typed: its bubble, and how it gets delivered. */
interface Typing {
  region: LoadingRegion;
  text: string;
  timer: number;
  done: () => void;
}

export function startInbox() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-inbox]');
  if (!section) return;
  const region = section.querySelector<LoadingRegion>('[data-thread-region]');
  const scroller = section.querySelector<HTMLElement>('[data-thread]');
  const later = section.querySelector<HTMLElement>('[data-later]');
  const form = section.querySelector<HTMLFormElement>('[data-composer]');
  const input = form?.querySelector('input');
  const note = section.querySelector<HTMLElement>('[data-note]');
  const preview = section.querySelector<HTMLElement>('[data-preview]');
  const controls = section.querySelector<HTMLElement>('[data-controls]');
  if (!region || !scroller || !later || !form || !input || !note || !controls)
    return;

  // The conversation loads when the section arrives.
  const arrives = arriveOnce(section, () => {
    if (!arrives) return;
    setTimeout(() => region.update({ state: 'ready' }), jitter(1300));
  });
  if (arrives) region.update({ state: 'pending' });

  let minute = 43;
  let fallback = 0;
  let suggestion = 0;
  let queue = Promise.resolve();
  /** Replies queued but not yet being typed. */
  let waiting = 0;
  let typing: Typing | undefined;
  /** The hold control is down: the reply being typed waits for it. */
  let holding = false;
  /** It was let go before the reply started: deliver that one at once. */
  let rush = false;

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
    waiting++;
    queue = queue.then(() => reply(answer));
  }

  /** Delivers the reply being typed: the dots unroll into its words. */
  function deliver() {
    const current = typing;
    if (!current) return;
    typing = undefined;
    clearTimeout(current.timer);
    current.region.update({ state: 'ready' });
    if (note) note.textContent = 'Inês Costa replied.';
    if (preview) preview.textContent = current.text;
    // Follow the bubble as it grows into the message.
    setTimeout(settle, 450);
    current.done();
  }

  /** Their reply: typing dots in the bubble, then the words. */
  async function reply(text: string) {
    await wait(holding ? 260 : jitter(520));
    waiting--;
    const message = document.createElement('div');
    message.className = 'va-msg them';
    const loading = document.createElement('dotquilt-region') as LoadingRegion;
    loading.setAttribute('aria-label', 'Reply from Inês Costa');
    loading.setAttribute('state', 'pending');
    const placeholder = document.createElement('div');
    placeholder.slot = 'placeholder';
    placeholder.className = 'va-bubble typing';
    placeholder.append(document.createElement('dotquilt-typing-dots'));
    loading.append(placeholder, bubble(text));
    message.append(avatar(), loading);
    later?.append(message);
    if (note) note.textContent = 'Inês Costa is typing…';
    settle();
    await new Promise<void>((done) => {
      typing = { region: loading, text, done, timer: 0 };
      if (rush) {
        rush = false;
        deliver();
      } else if (!holding)
        // Longer replies take a little longer to write.
        typing.timer = window.setTimeout(
          deliver,
          Math.min(2600, jitter(1100 + text.length * 22)),
        );
    });
    await wait(900);
  }

  // The hold control: pressing takes over the reply being typed, or sends
  // the next suggestion; letting go delivers.
  new Connection({
    name: 'inbox',
    subject: 'Inês’s reply',
    root: controls,
    labels: ['Hold for a reply', 'Let go to deliver', 'Hold for another'],
    words: { waiting: 'Typing', arrived: 'Replied after' },
    begin: () => {
      holding = true;
      rush = false;
      if (typing) clearTimeout(typing.timer);
      else if (!waiting) {
        const next = quickReplies[suggestion++ % quickReplies.length];
        send(next?.send ?? 'Thanks!');
      }
    },
    deliver: () => {
      holding = false;
      if (typing) deliver();
      else rush = true;
    },
  });

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
