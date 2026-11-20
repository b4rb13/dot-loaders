import { createHash } from 'node:crypto';
import * as core from 'dotquilt/server';

/**
 * Every stylesheet Dotquilt may add, as CSP hashes. Recompute them whenever
 * you upgrade: the hashes match the exact text of one version.
 */
export const styleHashes = Object.values(core)
  .filter(
    (value): value is readonly string[] =>
      Array.isArray(value) && value.every((item) => typeof item === 'string'),
  )
  .flat()
  .map(
    (css) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  );

export const contentSecurityPolicy = `default-src 'self'; style-src 'self' ${styleHashes.join(' ')}`;
