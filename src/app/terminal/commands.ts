// Command registry. Each command is a pure-ish function of (args, shell state) -> output lines.
import { PROFILE } from '../core/constants/profile';
import { parse } from './parser';
import { PortfolioData, skillsByTech, slugify, sortedEducation, yearRange } from './portfolio-fs';
import { HOME, VDir, VFile, VNode, displayPath, lookup, resolvePath, sortedChildren } from './vfs';

export type Tone = 'muted' | 'accent' | 'teal' | 'blue' | 'error' | 'dir' | 'exec';

export interface Seg {
  text: string;
  tone?: Tone;
  href?: string;
  swatch?: string; // CSS color, rendered as a colored block
}

export type Line = Seg[];

export interface Shell {
  root: VDir;
  cwd: string;
  prevCwd: string;
  setCwd(path: string): void;
  history: readonly string[];
  data: PortfolioData;
  cols: number; // approximate terminal width in characters
  open(route: string): void;
  clear(): void;
}

interface Command {
  summary: string;
  usage: string;
  run(args: string[], sh: Shell): Line[] | Promise<Line[]>;
}

const seg = (text: string, tone?: Tone): Seg => ({ text, tone });
const line = (text: string, tone?: Tone): Line => [seg(text, tone)];
const err = (text: string): Line[] => [line(text, 'error')];

const nameSeg = (name: string, node: VNode): Seg =>
  seg(name, node.type === 'dir' ? 'dir' : node.executable ? 'exec' : undefined);

// Plain text -> lines, with markdown headings highlighted and URLs made clickable.
export function textLines(content: string): Line[] {
  return content.split('\n').map((l) => {
    const tone: Tone | undefined = /^#{1,6}\s/.test(l) ? 'accent' : undefined;
    return l
      .split(/(https?:\/\/\S+)/)
      .filter(Boolean)
      .map((part) =>
        /^https?:\/\//.test(part)
          ? { text: part, href: part, tone: 'blue' as const }
          : seg(part, tone),
      );
  });
}

function parseFlags(
  args: string[],
  allowed: string,
  cmd: string,
): { error: Line[] } | { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const arg of args) {
    if (arg.startsWith('--')) return { error: err(`${cmd}: unrecognized option '${arg}'`) };
    if (arg.startsWith('-') && arg.length > 1) {
      for (const ch of arg.slice(1)) {
        if (!allowed.includes(ch)) return { error: err(`${cmd}: invalid option -- '${ch}'`) };
        flags.add(ch);
      }
    } else rest.push(arg);
  }
  return { flags, rest };
}

const at = (sh: Shell, path: string) => lookup(sh.root, resolvePath(sh.cwd, path));

async function read(file: VFile): Promise<string> {
  return file.load ? file.load() : file.content;
}

async function cat(args: string[], sh: Shell): Promise<Line[]> {
  if (!args.length) return err('cat: missing file operand. Usage: cat <file>...');
  const out: Line[] = [];
  for (const arg of args) {
    const node = at(sh, arg);
    if (!node) out.push(...err(`cat: ${arg}: No such file or directory`));
    else if (node.type === 'dir') out.push(...err(`cat: ${arg}: Is a directory`));
    else {
      try {
        out.push(...textLines(await read(node)));
      } catch {
        out.push(...err(`cat: ${arg}: could not be loaded, try again later`));
      }
    }
  }
  return out;
}

function ls(args: string[], sh: Shell): Line[] {
  const parsed = parseFlags(args, 'la', 'ls');
  if ('error' in parsed) return parsed.error;
  const { flags, rest } = parsed;
  const targets = rest.length ? rest : ['.'];
  const out: Line[] = [];

  for (const target of targets) {
    const node = at(sh, target);
    if (!node) {
      out.push(...err(`ls: cannot access '${target}': No such file or directory`));
      continue;
    }
    if (targets.length > 1 && node.type === 'dir') {
      if (out.length) out.push([]);
      out.push(line(`${target}:`));
    }
    const entries: [string, VNode][] =
      node.type === 'dir'
        ? [
            ...(flags.has('a')
              ? ([
                  ['.', node],
                  ['..', node],
                ] as [string, VNode][])
              : []),
            ...sortedChildren(node).map((c): [string, VNode] => [c.name, c]),
          ]
        : [[target, node]];

    if (flags.has('l')) {
      if (node.type === 'dir') out.push(line(`total ${entries.length}`, 'muted'));
      for (const [name, n] of entries) {
        const mode = n.type === 'dir' ? 'drwxr-xr-x' : n.executable ? '-rwxr-xr-x' : '-rw-r--r--';
        const size = n.type === 'file' && !n.load ? String(n.content.length) : '-';
        out.push([seg(`${mode}  aleksa  ${size.padStart(5)}  `, 'muted'), nameSeg(name, n)]);
      }
    } else if (entries.length) {
      out.push(entries.flatMap(([name, n], i) => [...(i ? [seg('  ')] : []), nameSeg(name, n)]));
    }
  }
  return out;
}

function cd(args: string[], sh: Shell): Line[] {
  if (args.length > 1) return err('cd: too many arguments');
  const target = args[0] ?? '~';
  const path = target === '-' ? sh.prevCwd : resolvePath(sh.cwd, target);
  const node = lookup(sh.root, path);
  if (!node) return err(`cd: ${target}: No such file or directory`);
  if (node.type !== 'dir') return err(`cd: ${target}: Not a directory`);
  sh.setCwd(path);
  return target === '-' ? [line(displayPath(path))] : [];
}

function tree(args: string[], sh: Shell): Line[] {
  const parsed = parseFlags(args, '', 'tree');
  if ('error' in parsed) return parsed.error;
  if (parsed.rest.length > 1)
    return err('tree: only one directory is supported. Usage: tree [dir]');
  const target = parsed.rest[0] ?? '.';
  const node = at(sh, target);
  if (!node) return err(`tree: ${target}: No such file or directory`);
  if (node.type === 'file') return [[nameSeg(target, node)]];

  const out: Line[] = [[seg(target, 'dir')]];
  let dirs = 0;
  let files = 0;
  const walk = (d: VDir, prefix: string) => {
    const kids = sortedChildren(d);
    kids.forEach((kid, i) => {
      const last = i === kids.length - 1;
      out.push([seg(prefix + (last ? '└── ' : '├── '), 'muted'), nameSeg(kid.name, kid)]);
      if (kid.type === 'dir') {
        dirs++;
        walk(kid, prefix + (last ? '    ' : '│   '));
      } else files++;
    });
  };
  walk(node, '');
  out.push(
    [],
    line(
      `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`,
      'muted',
    ),
  );
  return out;
}

const globToRegex = (glob: string) =>
  new RegExp(
    '^' +
      glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$',
  );

function find(args: string[], sh: Shell): Line[] {
  let start = '.';
  let i = 0;
  let name: RegExp | null = null;
  let type: string | null = null;
  if (args[0] && !args[0].startsWith('-')) start = args[i++];
  for (; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    if (arg === '-name' || arg === '-type') {
      if (value === undefined) return err(`find: missing argument to '${arg}'`);
      if (arg === '-type' && value !== 'f' && value !== 'd')
        return err(`find: unknown argument to -type: ${value}`);
      if (arg === '-name') name = globToRegex(value);
      else type = value;
      i++;
    } else if (!arg.startsWith('-')) {
      return err(`find: paths must precede expression: '${arg}'`);
    } else {
      return err(`find: unknown predicate '${arg}' (supported: -name, -type)`);
    }
  }

  const node = at(sh, start);
  if (!node) return err(`find: '${start}': No such file or directory`);
  const out: Line[] = [];
  const visit = (n: VNode, path: string) => {
    const base = path.split('/').filter(Boolean).pop() ?? path;
    const nameOk = !name || name.test(base);
    const typeOk = !type || (type === 'd') === (n.type === 'dir');
    if (nameOk && typeOk) out.push([nameSeg(path, n)]);
    if (n.type === 'dir')
      sortedChildren(n).forEach((c) => visit(c, `${path.replace(/\/$/, '')}/${c.name}`));
  };
  visit(node, start);
  return out;
}

function projects(_: string[], sh: Shell): Line[] {
  const list = sh.data.projects;
  if (!list.length) return [line('No projects listed yet.', 'muted')];
  const width = Math.max(...list.map((p) => slugify(p.title).length)) + 3;
  return [
    ...list.map((p) => [
      seg((slugify(p.title) + '/').padEnd(width), 'dir'),
      seg(p.description, 'muted'),
    ]),
    [],
    line(`cd ~/projects/<name> to explore, or open ~/projects/<name>`, 'muted'),
  ];
}

const LOGO = [
  '         /\\         ',
  '        /  \\        ',
  '       / /\\ \\       ',
  '      / /  \\ \\  /\\  ',
  '     / /    \\ \\/  \\ ',
  '    /_/      \\_\\___\\',
];

function neofetch(_: string[], sh: Shell): Line[] {
  const { about, projects, education, location } = sh.data;
  const latest = sortedEducation(education)[0];
  const kv = (key: string, value?: string): Line | null =>
    value ? [seg(key.padEnd(11), 'teal'), seg(value)] : null;
  const info = [
    [seg(`${PROFILE.user}@${PROFILE.host}`, 'accent')],
    [seg('-'.repeat(PROFILE.user.length + PROFILE.host.length + 1), 'muted')],
    kv('Name', about?.fullName),
    kv('Role', about?.title),
    kv('Location', location),
    kv(
      'Education',
      latest && latest.degree + (yearRange(latest).endsWith('(expected)') ? ' (in progress)' : ''),
    ),
    kv('Projects', `${projects.length}, see ~/projects`),
    kv(
      'Stack',
      skillsByTech(projects)
        .slice(0, 5)
        .map(([t]) => t)
        .join(', ') || undefined,
    ),
    kv('Site', 'Angular 22 · Node.js/Express API'),
    kv('Shell', 'portfolio-sh (runs in your browser)'),
    kv('Email', about?.email),
    [],
    [
      '--color-accent',
      '--color-teal',
      '--color-blue',
      '--color-ink',
      '--color-muted',
      '--color-line',
    ].map((c): Seg => ({ text: '   ', swatch: `var(${c})` })),
  ].filter((l): l is Line => l !== null);

  const logoWidth = LOGO[0].length + 3;
  if (sh.cols < logoWidth + 48) {
    return [...LOGO.map((l) => line(l, 'teal')), [], ...info];
  }
  return Array.from({ length: Math.max(LOGO.length, info.length) }, (_, i) => [
    seg((LOGO[i] ?? '').padEnd(logoWidth), 'teal'),
    ...(info[i] ?? []),
  ]);
}

function hire(sh: Shell): Line[] {
  const contact = lookup(sh.root, `${HOME}/contact.txt`);
  sh.open('/contact');
  return [
    ...(contact?.type === 'file' ? textLines(contact.content).slice(0, -2) : []),
    [],
    line('Opening the contact form...', 'muted'),
  ];
}

// Paths like ./hire-aleksa.sh or ~/hire-aleksa.sh
function runPath(path: string, sh: Shell): Line[] {
  const node = at(sh, path);
  if (!node) return err(`portfolio-sh: ${path}: No such file or directory`);
  if (node.type === 'dir') return err(`portfolio-sh: ${path}: Is a directory`);
  if (!node.executable) return err(`portfolio-sh: ${path}: Permission denied`);
  return hire(sh);
}

const COMMANDS = {
  help: {
    summary: 'list commands and examples',
    usage: 'help',
    run: (): Line[] => [
      line('Available commands:'),
      ...Object.entries(COMMANDS).map(([name, c]) => [
        seg('  ' + name.padEnd(11), 'accent'),
        seg(c.summary),
      ]),
      [seg('  ' + './hire-aleksa.sh'.padEnd(11), 'exec'), seg('  you know what this does')],
      [],
      line('Try:'),
      ...['ls -la', 'cd projects', 'cat about.md', 'tree', 'find . -name "*.md"'].map((ex) => [
        seg('  $ ', 'muted'),
        seg(ex),
      ]),
      [],
      line('Tab completes, ↑/↓ browse history, Ctrl+L clears. man <command> for details.', 'muted'),
    ],
  },
  man: {
    summary: 'show the manual for a command',
    usage: 'man <command>',
    run: (args) => {
      if (!args.length) return err('What manual page do you want? Usage: man <command>');
      const cmd = getCommand(args[0]);
      if (!cmd) return err(`No manual entry for ${args[0]}`);
      return [
        line('NAME', 'accent'),
        line(`    ${args[0]} - ${cmd.summary}`),
        [],
        line('SYNOPSIS', 'accent'),
        line(`    ${cmd.usage}`),
      ];
    },
  },
  ls: { summary: 'list directory contents', usage: 'ls [-l] [-a] [path...]', run: ls },
  cd: { summary: 'change directory', usage: 'cd [dir | ~ | - | ..]', run: cd },
  pwd: { summary: 'print working directory', usage: 'pwd', run: (_, sh) => [line(sh.cwd)] },
  cat: { summary: 'print file contents', usage: 'cat <file>...', run: cat },
  tree: { summary: 'show a directory tree', usage: 'tree [dir]', run: tree },
  find: { summary: 'search for files', usage: 'find [path] [-name <glob>] [-type f|d]', run: find },
  open: {
    summary: 'open a file or folder in the window next to the terminal',
    usage: 'open <path>',
    run: (args, sh) => {
      if (args.length !== 1) return err('Usage: open <path>');
      const node = at(sh, args[0]);
      if (!node) return err(`open: ${args[0]}: No such file or directory`);
      if (!node.route) return err(`open: ${args[0]}: no graphical view, try: cat ${args[0]}`);
      sh.open(node.route);
      return [line(`Opened ${args[0]}`, 'muted')];
    },
  },
  echo: {
    summary: 'print arguments',
    usage: 'echo [text...]',
    run: (args) => [line(args.join(' '))],
  },
  history: {
    summary: 'show command history',
    usage: 'history',
    run: (_, sh) =>
      sh.history.map((h, i) => [seg(String(i + 1).padStart(4) + '  ', 'muted'), seg(h)]),
  },
  clear: {
    summary: 'clear the screen',
    usage: 'clear',
    run: (_, sh) => {
      sh.clear();
      return [];
    },
  },
  whoami: { summary: 'print the current user', usage: 'whoami', run: () => [line(PROFILE.user)] },
  neofetch: { summary: 'show profile summary', usage: 'neofetch', run: neofetch },
  about: {
    summary: 'same as cat ~/about.md',
    usage: 'about',
    run: (_, sh) => cat(['~/about.md'], sh),
  },
  projects: { summary: 'list projects', usage: 'projects', run: projects },
  skills: {
    summary: 'same as cat ~/skills.md',
    usage: 'skills',
    run: (_, sh) => cat(['~/skills.md'], sh),
  },
  education: {
    summary: 'same as cat ~/education.md',
    usage: 'education',
    run: (_, sh) => cat(['~/education.md'], sh),
  },
  contact: {
    summary: 'same as cat ~/contact.txt',
    usage: 'contact',
    run: (_, sh) => cat(['~/contact.txt'], sh),
  },
  github: {
    summary: 'GitHub profile and repositories',
    usage: 'github',
    run: (_, sh) => [
      textLines(`profile  ${PROFILE.github}`)[0],
      ...sh.data.projects
        .filter((p) => p.repoUrl)
        .map((p) => textLines(`  ${slugify(p.title).padEnd(22)}${p.repoUrl}`)[0]),
    ],
  },
} satisfies Record<string, Command>;

export const COMMAND_NAMES = Object.keys(COMMANDS);

function getCommand(name: string): Command | undefined {
  return Object.hasOwn(COMMANDS, name) ? (COMMANDS as Record<string, Command>)[name] : undefined;
}

export async function execute(input: string, sh: Shell): Promise<Line[]> {
  const parsed = parse(input);
  if ('error' in parsed) return err(`portfolio-sh: ${parsed.error}`);
  const [name, ...args] = parsed.args;
  if (!name) return [];
  if (name.includes('/')) return runPath(name, sh);

  const cmd = getCommand(name);
  if (!cmd) {
    const local = at(sh, name);
    const hint = local?.type === 'file' && local.executable ? ` (did you mean ./${name}?)` : '';
    return err(`${name}: command not found${hint}. Type 'help' for a list.`);
  }
  try {
    return await cmd.run(args, sh);
  } catch {
    return err(`${name}: something went wrong`);
  }
}
