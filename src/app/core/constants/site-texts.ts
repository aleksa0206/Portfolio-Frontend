// Small static texts on the public site that the admin can override (About → Site texts).
// Stored as `About.texts` ({ key: text }). An empty or missing value falls back to the default here.
// Wrap terminal commands in `backticks` to highlight them.
export const SITE_TEXTS = {
  'terminal.welcome': {
    label: 'Terminal welcome',
    default: "Hi, I'm Aleksa. This is my portfolio, and it's a shell, so feel free to look around.",
  },
  'home.next.heading': { label: 'Home: links heading', default: 'where to next' },
  'home.next.projects': {
    label: 'Home: projects/ description',
    default: "things I've built, with their READMEs",
  },
  'home.next.education': { label: 'Home: education.md description', default: 'where I studied' },
  'home.next.contact': {
    label: 'Home: contact.txt description',
    default: 'email, GitHub, or send me a message',
  },
  'home.terminalHint': {
    label: 'Home: terminal hint',
    default: 'Or use the terminal: `help`, `ls`, `cat about.md`',
  },
  'terminal.hint': {
    label: 'Terminal hint (under the welcome)',
    default: 'Type `help` for commands, or start with `ls`.',
  },
  // Optional notes shown to the right of a contact row
  'contact.note.email': { label: 'Contact: note next to email', default: '' },
  'contact.note.github': { label: 'Contact: note next to github', default: '' },
  'contact.note.linkedin': { label: 'Contact: note next to linkedin', default: '' },
  'contact.note.location': { label: 'Contact: note next to location', default: '' },
} satisfies Record<string, { label: string; default: string }>;

export type SiteTextKey = keyof typeof SITE_TEXTS;

// Text in `backticks` is a terminal command: shown highlighted and checked in the admin form.
export function splitCode(text: string): { text: string; code: boolean }[] {
  return text
    .split('`')
    .map((part, i) => ({ text: part, code: i % 2 === 1 }))
    .filter((p) => p.text);
}

// Backticked commands the terminal doesn't have (paths like ./hire-aleksa.sh are allowed).
export function unknownCommands(text: string, commands: readonly string[]): string[] {
  return splitCode(text)
    .filter((p) => p.code)
    .map((p) => p.text.trim().split(/\s+/)[0])
    .filter((name) => !name.includes('/') && !commands.includes(name));
}
