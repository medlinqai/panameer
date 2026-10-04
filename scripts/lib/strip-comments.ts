
const JSX_COMMENT = /\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g;

export function stripComments(src: string): string {
  return src
    .replace(JSX_COMMENT, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

export function blankComments(src: string): string {
  const keepNewlines = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(JSX_COMMENT, keepNewlines)
    .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => p1);
}
