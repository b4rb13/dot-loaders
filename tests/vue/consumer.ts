// Type-checked by scripts/pack-smoke.test.ts as a consumer would, against
// the built @dotquilt/vue: props, slots and events are typed.
import {
  type HandoffDetail,
  LoadingRegion,
  SkeletonText,
  TableLoader,
  TextLoader,
  TypingDots,
} from '@dotquilt/vue';
import { LoadingRegion as RegionEntry } from '@dotquilt/vue/region';
import { h } from 'vue';

h(
  LoadingRegion,
  {
    state: 'pending',
    cycle: '2',
    delay: 200,
    timing: { duration: 0 },
    'aria-label': 'Revenue',
    onHandoffEnd: (event: CustomEvent<HandoffDetail>) => event.detail.reason,
  },
  {
    placeholder: () => h(SkeletonText, { lines: 2, widths: [1, 0.6] }),
    default: () => h('article', 'content'),
  },
);
h(RegionEntry, { state: 'refreshing' });
h(TableLoader, { columns: [{ kind: 'number', width: 0.3 }], rows: 4 });
h(TypingDots, { count: 3, mark: 'square' });
h(TextLoader, { state: 'ready', mask: '$00,000' }, () => '$12,400');

// @ts-expect-error: not a loading state
h(LoadingRegion, { state: 'loading' });
// @ts-expect-error: not a column kind
h(TableLoader, { columns: [{ kind: 'image' }] });
// @ts-expect-error: not a mark
h(TypingDots, { mark: 'star' });
