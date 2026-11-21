import { Component, signal } from '@angular/core';
import { SkeletonBlock, TypingDots } from '@dotquilt/angular';

/** Edge cases tests/angular drives in a browser; not part of the example. */
@Component({
  selector: 'app-checks-page',
  imports: [SkeletonBlock, TypingDots],
  template: `
    <h1>Checks</h1>
    <dotquilt-typing-dots
      [count]="0"
      (loaderError)="errors.set([...errors(), $event.detail.code])"
    />
    <p>Errors: {{ errors().join(', ') || 'none' }}</p>
    <dotquilt-skeleton-block style="height: 80px" />
  `,
})
export class ChecksPage {
  protected readonly errors = signal<string[]>([]);
}
