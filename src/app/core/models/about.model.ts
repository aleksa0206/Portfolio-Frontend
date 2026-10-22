export interface About {
  id: number;
  fullName: string;
  title: string;
  bio: string;
  photoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  linkedinUrl?: string;
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
  texts?: Partial<Record<string, string>>;
  email?: string;
  phone?: string;
  location?: string;
}