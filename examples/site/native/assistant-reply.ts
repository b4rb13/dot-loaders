import {
  type LoadingRegion,
  registerLoadingRegion,
} from '@dotquilt-internal/core/region';
import { registerTypingDots } from '@dotquilt-internal/core/typing';

registerLoadingRegion();
registerTypingDots();

const region = document.getElementById('reply') as LoadingRegion | null;
const bubble = region?.querySelector<HTMLElement>('[data-reply]');

export async function ask(question: string): Promise<void> {
  if (!region || !bubble) return;
  region.update({ state: 'pending', cycle: question });
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
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
