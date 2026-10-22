// Small static texts on the public site that the admin can override (About → Site texts).
// Stored as `About.texts` ({ key: text }). An empty or missing value falls back to the default here.
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
  'home.terminalHint': { label: 'Home: terminal hint', default: 'Or use the terminal:' },
} satisfies Record<string, { label: string; default: string }>;

export type SiteTextKey = keyof typeof SITE_TEXTS;
