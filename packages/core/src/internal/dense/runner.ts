import { createRunner, type Runner } from '../runner.js';
import { managedPainter } from './managed-painter.js';
export function createDenseRunner(
  host: HTMLElement,
  report: (code: string) => void,
  invalidate: () => void,
): Runner {
  return createRunner(host, report, invalidate, (element, issue, part) =>
    managedPainter(element, issue, part, true),
  );
}
