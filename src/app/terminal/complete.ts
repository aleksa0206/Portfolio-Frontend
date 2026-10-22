import { VDir, lookup, resolvePath, sortedChildren } from './vfs';

export interface Completion {
  value: string; // the new input value
  options: string[]; // shown when the completion is ambiguous and can't be extended
}

const commonPrefix = (words: string[]) =>
  words.reduce((acc, w) => {
    let i = 0;
    while (i < acc.length && acc[i] === w[i]) i++;
    return acc.slice(0, i);
  });

// Completes the last word of `input`: a command name in first position, otherwise a path.
export function complete(input: string, root: VDir, cwd: string, commands: string[]): Completion {
  const start = input.lastIndexOf(' ') + 1;
  const head = input.slice(0, start);
  const word = input.slice(start);
  const isCommand = head.trim() === '';

  let dirPart = '';
  let candidates: string[];
  if (isCommand && !word.includes('/')) {
    candidates = commands.filter((c) => c.startsWith(word)).map((c) => c + ' ');
  } else {
    const slash = word.lastIndexOf('/') + 1;
    dirPart = word.slice(0, slash);
    const base = word.slice(slash);
    const node = lookup(root, resolvePath(cwd, dirPart || '.'));
    candidates =
      node?.type === 'dir'
        ? sortedChildren(node)
            .filter((c) => c.name.startsWith(base))
            // in command position only directories and executables make sense
            .filter((c) => !isCommand || c.type === 'dir' || c.executable)
            .map((c) => c.name + (c.type === 'dir' ? '/' : ' '))
        : [];
  }

  if (!candidates.length) return { value: input, options: [] };
  const value = head + dirPart + commonPrefix(candidates);
  const options = candidates.length > 1 && value === input ? candidates.map((c) => c.trim()) : [];
  return { value, options };
}
