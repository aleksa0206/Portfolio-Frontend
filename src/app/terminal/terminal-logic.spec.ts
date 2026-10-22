import { Line, Shell, execute } from './commands';
import { complete } from './complete';
import { parse } from './parser';
import { PortfolioData, buildFs } from './portfolio-fs';
import { HOME, resolvePath } from './vfs';
import { COMMAND_NAMES } from './commands';

const data: PortfolioData = {
  about: {
    id: 1,
    fullName: 'Aleksa',
    title: 'Software Developer',
    bio: 'Bio text.',
    email: 'me@example.com',
    updatedAt: '',
  },
  projects: [
    {
      id: 1,
      title: 'TaskMaster',
      description: 'Django app',
      techStack: 'Python , Django',
      repoUrl: 'https://github.com/u/TaskMaster',
      order: 0,
      createdAt: '',
    },
    {
      id: 2,
      title: 'Developer Portfolio',
      description: 'This site',
      techStack: 'Angular, Python',
      order: 0,
      createdAt: '',
    },
  ],
  education: [],
  licenses: [],
  location: 'Belgrade, Serbia',
  readme: async () => '# TaskMaster\nreadme body',
};

function shell() {
  const opened: string[] = [];
  let cleared = false;
  const sh: Shell = {
    root: buildFs(data),
    cwd: HOME,
    prevCwd: HOME,
    setCwd(p) {
      sh.prevCwd = sh.cwd;
      sh.cwd = p;
    },
    history: [],
    data,
    cols: 100,
    open: (r) => opened.push(r),
    clear: () => (cleared = true),
  };
  return { sh, opened, wasCleared: () => cleared };
}

const text = (lines: Line[]) => lines.map((l) => l.map((s) => s.text).join('')).join('\n');

describe('parse', () => {
  it('splits words and keeps quoted spaces', () => {
    expect(parse(`find . -name "*.md"  'a b'`)).toEqual({
      args: ['find', '.', '-name', '*.md', 'a b'],
    });
  });
  it('rejects unterminated quotes and pipes', () => {
    expect('error' in parse('echo "oops')).toBe(true);
    expect('error' in parse('ls | grep x')).toBe(true);
  });
});

describe('resolvePath', () => {
  it('handles ~, .. and relative paths', () => {
    expect(resolvePath('/home/aleksa/projects', '../about.md')).toBe('/home/aleksa/about.md');
    expect(resolvePath('/', '~/projects')).toBe('/home/aleksa/projects');
    expect(resolvePath('/home', '../../..')).toBe('/');
  });
});

describe('commands', () => {
  it('cd + ls + cat work on the virtual filesystem', async () => {
    const { sh } = shell();
    await execute('cd projects/TaskMaster', sh);
    expect(sh.cwd).toBe('/home/aleksa/projects/TaskMaster');
    expect(text(await execute('ls', sh))).toBe('README.md  info.txt');
    expect(text(await execute('cat README.md', sh))).toContain('readme body');
    await execute('cd ..', sh);
    expect(text(await execute('ls', sh))).toBe('Developer-Portfolio  TaskMaster');
    await execute('cd -', sh);
    expect(sh.cwd).toBe('/home/aleksa/projects/TaskMaster');
  });

  it('reports errors like a shell', async () => {
    const { sh } = shell();
    expect(text(await execute('cd nope', sh))).toBe('cd: nope: No such file or directory');
    expect(text(await execute('cd about.md', sh))).toBe('cd: about.md: Not a directory');
    expect(text(await execute('cat projects', sh))).toBe('cat: projects: Is a directory');
    expect(text(await execute('ls -z', sh))).toBe("ls: invalid option -- 'z'");
    expect(text(await execute('foo', sh))).toContain('foo: command not found');
    expect(text(await execute('./about.md', sh))).toContain('Permission denied');
  });

  it('ls -la shows dot entries and modes', async () => {
    const { sh } = shell();
    const out = text(await execute('ls -la', sh));
    expect(out).toContain('drwxr-xr-x');
    expect(out).toContain('-rwxr-xr-x  aleksa');
    expect(out.split('\n')[1]).toMatch(/ \.$/);
  });

  it('find filters by name and type', async () => {
    const { sh } = shell();
    expect(text(await execute('find . -name "*.md" -type f', sh)).split('\n')).toEqual([
      './README.md',
      './about.md',
      './education.md',
      './projects/TaskMaster/README.md',
      './skills.md',
    ]);
  });

  it('tree counts directories and files', async () => {
    const { sh } = shell();
    expect(text(await execute('tree projects', sh))).toContain('2 directories, 3 files');
  });

  it('skills are derived from project stacks only', async () => {
    const { sh } = shell();
    const out = text(await execute('skills', sh));
    expect(out).toMatch(/- Python\s+TaskMaster, Developer Portfolio/);
  });

  it('open and the hire script navigate', async () => {
    const { sh, opened } = shell();
    await execute('open projects/TaskMaster', sh);
    await execute('./hire-aleksa.sh', sh);
    expect(opened).toEqual(['/projects/TaskMaster', '/contact']);
  });

  it('clear asks the terminal to clear', async () => {
    const { sh, wasCleared } = shell();
    await execute('clear', sh);
    expect(wasCleared()).toBe(true);
  });
});

describe('complete', () => {
  const root = buildFs(data);
  it('completes commands and paths', () => {
    expect(complete('ne', root, HOME, COMMAND_NAMES).value).toBe('neofetch ');
    expect(complete('cd pro', root, HOME, COMMAND_NAMES).value).toBe('cd projects/');
    expect(complete('cat projects/T', root, HOME, COMMAND_NAMES).value).toBe(
      'cat projects/TaskMaster/',
    );
    expect(complete('./hi', root, HOME, COMMAND_NAMES).value).toBe('./hire-aleksa.sh ');
  });
  it('lists options when ambiguous', () => {
    const result = complete('cat ~/projects/TaskMaster/', root, HOME, COMMAND_NAMES);
    expect(result.options).toEqual(['README.md', 'info.txt']);
  });
});
