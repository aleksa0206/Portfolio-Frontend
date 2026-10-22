// Builds the virtual filesystem from real portfolio data (the same API data the pages use).
import { About } from '../core/models/about.model';
import { Education } from '../core/models/education.model';
import { License } from '../core/models/license.model';
import { Project } from '../core/models/project.model';
import { PROFILE } from '../core/constants/profile';
import { VDir, VNode, dir, file } from './vfs';

export interface PortfolioData {
  about: About | null;
  projects: Project[];
  education: Education[];
  licenses: License[];
  location: string;
  readme: (repoUrl: string) => Promise<string>;
}

export const slugify = (s: string) =>
  s
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

export const techList = (p: Project) =>
  p.techStack
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

// tech -> titles of projects that use it, most used first
export function skillsByTech(projects: Project[]): [string, string[]][] {
  const map = new Map<string, { name: string; projects: string[] }>();
  for (const p of projects) {
    for (const tech of techList(p)) {
      const entry = map.get(tech.toLowerCase()) ?? { name: tech, projects: [] };
      entry.projects.push(p.title);
      map.set(tech.toLowerCase(), entry);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name))
    .map((e) => [e.name, e.projects]);
}

export function yearRange(e: Education): string {
  const start = e.startDate.slice(0, 4);
  if (!e.endDate) return `${start} — present`;
  const end = e.endDate.slice(0, 4);
  return new Date(e.endDate) > new Date() ? `${start} — ${end} (expected)` : `${start} — ${end}`;
}

export const sortedEducation = (list: Education[]) =>
  [...list].sort((a, b) => b.startDate.localeCompare(a.startDate));

const table = (rows: [string, string | undefined][]) => {
  const present = rows.filter((r): r is [string, string] => !!r[1]);
  const width = Math.max(...present.map(([k]) => k.length)) + 2;
  return present.map(([k, v]) => k.padEnd(width) + v).join('\n');
};

function aboutMd(d: PortfolioData): string {
  if (!d.about) return '# about\n\nNothing here yet.';
  const tagline = d.about.tagline ? `\n${d.about.tagline}` : '';
  return `# ${d.about.fullName}\n${d.about.title} · ${d.location}${tagline}\n\n${d.about.bio}\n\nMore: cat contact.txt, cd projects`;
}

function skillsMd(projects: Project[]): string {
  const skills = skillsByTech(projects);
  if (!skills.length) return '# skills\n\nNo projects listed yet.';
  const width = Math.max(...skills.map(([t]) => t.length)) + 2;
  const rows = skills.map(([tech, used]) => `- ${tech.padEnd(width)}${used.join(', ')}`);
  return `# skills\n\nTechnologies used in the projects under ~/projects.\nNot a self-rating, just what the code is actually written in.\n\n${rows.join('\n')}`;
}

function educationMd(list: Education[]): string {
  if (!list.length) return '# education\n\nNothing listed yet.';
  const entries = sortedEducation(list).map((e) =>
    [
      `## ${e.degree}${e.fieldOfStudy ? ', ' + e.fieldOfStudy : ''}`,
      `${e.institution} · ${yearRange(e)}`,
      e.description ? `\n${e.description}` : '',
    ].join('\n'),
  );
  return `# education\n\n${entries.join('\n\n')}`;
}

function contactTxt(d: PortfolioData): string {
  return `${table([
    ['email', d.about?.email],
    ['phone', d.about?.phone],
    ['github', PROFILE.github],
    ['location', d.location],
  ])}\n\nPrefer a form? Run: open contact.txt`;
}

function projectInfo(p: Project): string {
  return table([
    ['name', p.title],
    ['description', p.description],
    ['stack', techList(p).join(', ')],
    ['repo', p.repoUrl],
    ['demo', p.demoUrl],
  ]);
}

function licenseTxt(l: License): string {
  return table([
    ['name', l.name],
    ['issuer', l.issuer],
    ['issued', l.issueDate.slice(0, 10)],
    ['expires', l.expiryDate?.slice(0, 10)],
    ['credential', l.credentialUrl],
  ]);
}

const SITE_README = `# aleksa@portfolio

My portfolio, presented as a small Linux-style shell.
The files here are a virtual filesystem built from the same data as the rest
of the site. Nothing runs on a server.

Start with:
  ls               list files
  cat about.md     who I am
  cd projects      what I've built
  help             every command`;

export const HIRE_SCRIPT = `#!/usr/bin/env bash
# Usage: ./hire-aleksa.sh
set -euo pipefail

cat ~/contact.txt
echo "Opening the contact form..."
xdg-open /contact`;

export function buildFs(d: PortfolioData): VDir {
  const projects: VNode[] = d.projects.map((p) => {
    const route = `/projects/${slugify(p.title)}`;
    const repoUrl = p.repoUrl;
    return dir(
      slugify(p.title),
      [
        file('info.txt', projectInfo(p), { route }),
        ...(repoUrl ? [file('README.md', '', { route, load: () => d.readme(repoUrl) })] : []),
      ],
      route,
    );
  });

  const certificates = d.licenses.map((l) =>
    file(`${slugify(l.name)}.txt`, licenseTxt(l), { route: '/licenses' }),
  );

  const home = dir('aleksa', [
    file('README.md', SITE_README),
    file('about.md', aboutMd(d), { route: '/' }),
    file('skills.md', skillsMd(d.projects)),
    file('education.md', educationMd(d.education), { route: '/education' }),
    file('contact.txt', contactTxt(d), { route: '/contact' }),
    file('hire-aleksa.sh', HIRE_SCRIPT, { executable: true, route: '/contact' }),
    dir('projects', projects, '/projects'),
    dir('certificates', certificates, '/licenses'),
  ]);

  return dir('', [dir('home', [home])]);
}
