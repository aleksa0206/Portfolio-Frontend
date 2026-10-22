export interface About {
  id: number;
  fullName: string;
  title: string;
  bio: string;
  photoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  contactLinks?: ContactLink[];
  skills?: Skill[];
  texts?: Partial<Record<string, string>>;
  email?: string;
  phone?: string;
  location?: string;
  updatedAt: string;
}

export interface AboutInput {
  fullName: string;
  title: string;
  bio: string;
  photoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  contactLinks?: ContactLink[];
  skills?: Skill[];
  texts?: Partial<Record<string, string>>;
  email?: string;
  phone?: string;
  location?: string;
}
// Extra row in the contact section, e.g. { label: "twitter", value: "https://x.com/..." }
export interface ContactLink {
  label: string;
  value: string;
}

// A row in skills.md, written in the admin
export interface Skill {
  name: string;
  description: string;
}
