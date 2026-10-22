// Small static texts on the public site that the admin can override (About → Site texts).
// Stored as `About.texts` ({ key: text }). An empty or missing value falls back to the default here.
// Wrap terminal commands in `backticks` to highlight them.
export const SITE_TEXTS = {
  'terminal.welcome': {
    label: 'Terminal welcome',
    default: "Hi, I'm Aleksa. This is my portfolio, and it's a shell, so feel free to look around.",
  },
  'home.next.heading': { label: 'Home: links heading', default: 'where to next' },
  'education.heading': { label: 'Education: page heading', default: 'education' },
  'skills.heading': { label: 'Skills: page heading', default: 'skills' },
  'skills.intro': {
    label: "Skills: text above the list (the list itself comes from the projects' tech stacks)",
    default:
      'Technologies used in the projects under ~/projects.\nNot a self-rating, just what the code is actually written in.',
  },
  'certificates.heading': { label: 'Certificates: page heading', default: 'certificates' },
  'certificates.empty': {
    label: 'Certificates: text when there are none',
    default: 'total 0, nothing listed here yet.',
  },
  'contact.heading': { label: 'Contact: page heading', default: 'contact' },
  'contact.formHeading': { label: 'Contact: form heading', default: 'send a message' },
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
  // The "important" file: two "are you curious?" popups, then the CV download
  'important.q1': { label: 'Important file: first popup', default: "You're really curious, huh?" },
  'important.yes1': { label: 'Important file: first popup, yes button', default: 'I am' },
  'important.no': { label: 'Important file: no button', default: 'Not really' },
  'important.nope': {
    label: 'Important file: text after saying no',
    default: 'Good. Nothing to see here.',
  },
  'important.q2': {
    label: 'Important file: second popup',
    default: "Are you sure you're THAT curious?",
  },
  'important.yes2': { label: 'Important file: second popup, yes button', default: "Yes, I'm sure" },
  'important.reveal': {
    label: 'Important file: text above the CV download',
    default: "Well, since you're that curious...",
  },
  'important.download': { label: 'Important file: download button', default: 'Download my CV' },
  // Optional notes shown to the right of a contact row
  'contact.note.email': { label: 'Contact: note next to email', default: '' },
  'contact.note.phone': { label: 'Contact: note next to phone', default: '' },
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
