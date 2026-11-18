import { createHash } from 'node:crypto';
/** Only the generated registration identity and Bun's temporary-path comments. */
export function entrySignature(data: string) {
  let replacements = 0,
    moduleComments = 0;
  const comments = data.replace(/^\/\/ [^\n]*dotquilt-m4-[^\n]*$/gm, (line) => {
    moduleComments++;
    return line.replace(/dotquilt-m4-[A-Za-z0-9]+/g, 'dotquilt-m4-CONSUMER');
  });
  const normalized = comments.replace(
    /dotquilt\/0\.0\.0-m2\.0\+[0-9a-f]{12}/g,
    () => {
      replacements++;
      return 'dotquilt/0.0.0-m2.0+SOURCE_IDENTITY';
    },
  );
  return {
    sha256: createHash('sha256').update(normalized).digest('hex'),
    replacements,
    moduleComments,
  };
}
