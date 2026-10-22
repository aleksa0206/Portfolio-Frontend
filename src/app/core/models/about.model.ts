export interface About {
  id: number;
  fullName: string;
  title: string;
  bio: string;
  photoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  linkedinUrl?: string;
  contactLinks?: ContactLink[];
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
  contactLinks?: ContactLink[];
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
