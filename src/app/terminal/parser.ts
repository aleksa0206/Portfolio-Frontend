export type ParseResult = { args: string[] } | { error: string };

// Splits a command line into words. Supports 'single' and "double" quotes and \ escapes.
// Pipes, redirection and chaining are rejected instead of being silently treated as text.
export function parse(input: string): ParseResult {
  const args: string[] = [];
  let current = '';
  let inWord = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < input.length) current += input[++i];
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (ch === '\\' && i + 1 < input.length) {
      current += input[++i];
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) args.push(current);
      current = '';
      inWord = false;
    } else if ('|><;&'.includes(ch)) {
      return { error: `pipes, redirection and chaining are not supported ('${ch}')` };
    } else {
      current += ch;
      inWord = true;
    }
  }

  if (quote) return { error: `unexpected end of input, missing closing ${quote}` };
  if (inWord) args.push(current);
  return { args };
}
