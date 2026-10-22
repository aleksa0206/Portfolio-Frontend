// Generic in-memory filesystem: node types and path resolution. No portfolio specifics here.

export interface VFile {
  type: 'file';
  name: string;
  content: string;
  load?: () => Promise<string>; // lazily fetched content (e.g. README from GitHub)
  route?: string; // where `open` navigates to
  executable?: boolean;
}

export interface VDir {
  type: 'dir';
  name: string;
  children: VNode[];
  route?: string;
}

export type VNode = VFile | VDir;

export const HOME = '/home/aleksa';

export function file(name: string, content: string, extra: Partial<VFile> = {}): VFile {
  return { type: 'file', name, content, ...extra };
}

export function dir(name: string, children: VNode[], route?: string): VDir {
  return { type: 'dir', name, children, route };
}

// Resolves `path` against `cwd` into an absolute, normalized path. Handles ~, ., .. and //.
export function resolvePath(cwd: string, path: string): string {
  const expanded = path === '~' || path.startsWith('~/') ? HOME + path.slice(1) : path;
  const absolute = expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`;
  const parts: string[] = [];
  for (const part of absolute.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return '/' + parts.join('/');
}

export function lookup(root: VDir, absolute: string): VNode | null {
  let node: VNode = root;
  for (const part of absolute.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null;
    const next: VNode | undefined = node.children.find((c) => c.name === part);
    if (!next) return null;
    node = next;
  }
  return node;
}

// /home/aleksa/projects -> ~/projects
export function displayPath(absolute: string): string {
  if (absolute === HOME) return '~';
  return absolute.startsWith(HOME + '/') ? '~' + absolute.slice(HOME.length) : absolute;
}

// Byte order, like `ls` with LC_ALL=C (uppercase first), so it's the same in every browser locale
export function sortedChildren(node: VDir): VNode[] {
  return [...node.children].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
