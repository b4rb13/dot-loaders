import ts from 'typescript-min';

/** Inspect the directive prologue; comments do not end it, statements do. */
export function hasClientDirective(source: string): boolean {
  const file = ts.createSourceFile(
    'consumer.js',
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  for (const statement of file.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      return false;
    if (/^(['"])use client\1$/.test(statement.expression.getText(file)))
      return true;
  }
  return false;
}
