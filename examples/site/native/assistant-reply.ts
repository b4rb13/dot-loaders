import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { registerTypingDots } from 'dotquilt/typing';

registerLoadingRegion();
registerTypingDots();

const region = document.getElementById('reply') as LoadingRegion | null;
const bubble = region?.querySelector<HTMLElement>('[data-reply]');

export async function ask(question: string): Promise<void> {
  if (!region || !bubble) return;
  // Each load starts with the default handoff; an error below swaps at once.
  region.update({ state: 'pending', cycle: question, timing: undefined });
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const { reply }: { reply: string } = await response.json();
    if (region.cycle !== question) return;
    bubble.textContent = reply;
    region.update({ state: 'ready' });
  } catch {
    if (region.cycle !== question) return;
    bubble.textContent = "Sorry, I couldn't answer that. Try again.";
    region.update({ state: 'ready', timing: { duration: 0 } });
  }
}

void ask('When is the Globex invoice due?');
