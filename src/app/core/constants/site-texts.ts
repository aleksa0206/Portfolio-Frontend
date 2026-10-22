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
  // Joke "agreement" popup on the first visit
  'consent.question': {
    label: 'Popup: question',
    default:
      "Do you agree not to do anything stupid on this site?\n(And no, this isn't consent to any cookies.)",
  },
  'consent.agree': { label: 'Popup: agree button', default: 'I agree' },
  'consent.disagree': { label: "Popup: disagree button (the one that runs away)", default: "I don't agree" },
  'consent.after': {
    label: 'Popup: message after agreeing',
    default: "Great. Now just click the X, I'm not standing here for nothing.",
  },
  // How often the popup comes back; edited with a select in the admin, not as free text
  'consent.repeat': { label: 'Popup: show it', default: 'visit' satisfies ConsentRepeat },
  // Idle easter egg: red theme + evil smiley in the terminal; minutes is a select in the admin
  'prank.minutes': { label: 'Easter egg: idle minutes', default: '3' },
  'prank.message': {
    label: 'Easter egg: message under the IP',
    default: "Didn't anyone teach you not to click on everything you see on the internet?",
  },
  'prank.malicious': {
    label: 'Easter egg: message after a dangerous command (rm -rf, sudo, ...), the IP follows it',
    default:
      "You said you wouldn't do anything stupid. Now I have to come over and tell you in person.\nBy the way, this is your IP address:",
  },
  'prank.kidding': {
    label: 'Easter egg: message when it lets go',
    default: '...just kidding :) Press any key or click to continue.',
  },
  // Optional notes shown to the right of a contact row
  'contact.note.email': { label: 'Contact: note next to email', default: '' },
  'contact.note.github': { label: 'Contact: note next to github', default: '' },
  'contact.note.linkedin': { label: 'Contact: note next to linkedin', default: '' },
  'contact.note.location': { label: 'Contact: note next to location', default: '' },
} satisfies Record<string, { label: string; default: string }>;

export type SiteTextKey = keyof typeof SITE_TEXTS;

// Text in `backticks` is a terminal command, shown highlighted.
export function splitCode(text: string): { text: string; code: boolean }[] {
  return text
    .split('`')
    .map((part, i) => ({ text: part, code: i % 2 === 1 }))
    .filter((p) => p.text);
}


export const CONSENT_REPEAT = {
  visit: 'every time the site is opened (not on refresh)',
  day: 'once a day',
  week: 'once a week',
  once: 'only the first time',
  off: 'never (popup off)',
} as const;

export type ConsentRepeat = keyof typeof CONSENT_REPEAT;
