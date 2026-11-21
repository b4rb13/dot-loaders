// Use it as <app-assistant-reply question="When is the Globex invoice due?" />;
// it asks again whenever question changes.
import { afterRenderEffect, Component, input, signal } from '@angular/core';
import {
  DotquiltPlaceholder,
  LoadingRegion,
  TypingDots,
} from '@dotquilt/angular';

async function fetchReply(
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const { reply } = await response.json();
  return reply;
}

@Component({
  selector: 'app-assistant-reply',
  imports: [DotquiltPlaceholder, LoadingRegion, TypingDots],
  template: `
    <dotquilt-region
      aria-label="Assistant reply"
      [state]="reply() === null && !failed() ? 'pending' : 'ready'"
      [cycle]="question()"
      [timing]="failed() ? { duration: 0 } : undefined"
    >
      <div dotquiltPlaceholder>
        <div class="bubble">
          <dotquilt-typing-dots />
        </div>
      </div>
      <div class="bubble">
        {{ failed() ? "Sorry, I couldn't answer that. Try again." : reply() }}
      </div>
    </dotquilt-region>
  `,
})
export class AssistantReply {
  readonly question = input.required<string>();
  protected readonly reply = signal<string | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    afterRenderEffect((onCleanup) => {
      const request = new AbortController();
      this.reply.set(null);
      this.failed.set(false);
      fetchReply(this.question(), request.signal)
        .then((reply) => this.reply.set(reply))
        .catch(() => {
          if (!request.signal.aborted) this.failed.set(true);
        });
      onCleanup(() => request.abort());
    });
  }
}
