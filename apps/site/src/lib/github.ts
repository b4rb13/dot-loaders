/**
 * The repository on GitHub, and its star count read once at build time.
 *
 * The count is fetched while the site builds (every merge to main deploys
 * it), so the pages stay static and the visitor's browser makes no request
 * to GitHub. If GitHub can't be reached or limits the request, pages show
 * the link without a count.
 */
export const repository = 'https://github.com/b4rb13/dot-loaders';

let stars: Promise<number | undefined> | undefined;

/** The star count, or undefined when GitHub didn't answer in time. */
export function starCount(): Promise<number | undefined> {
  stars ??= (async () => {
    try {
      const token = process.env.GITHUB_TOKEN;
      const response = await fetch(
        'https://api.github.com/repos/b4rb13/dot-loaders',
        {
          headers: {
            accept: 'application/vnd.github+json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (!response.ok) return undefined;
      const { stargazers_count: count } = (await response.json()) as {
        stargazers_count?: unknown;
      };
      return typeof count === 'number' ? count : undefined;
    } catch {
      return undefined;
    }
  })();
  return stars;
}

/** 999 → "999", 1234 → "1.2k", 12000 → "12k". */
export function shortCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands < 10 ? Number(thousands.toFixed(1)) : Math.round(thousands)}k`;
}
