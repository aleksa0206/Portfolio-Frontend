import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { PROFILE } from '../../../core/constants/profile';
import { AboutService } from '../../../core/services/about.service';
import { MessageKey, Messages } from '../../../core/constants/messages';
import { CONSENT_REPEAT, SITE_TEXTS, unknownCommands } from '../../../core/constants/site-texts';
import { COMMAND_NAMES } from '../../../terminal/commands';

// Longest side in px. Images are stored inline in the DB, so keep them small.
const IMAGE_SIZE = { faviconUrl: 64 };

// Blocks saving a site text whose `backticked` command the terminal doesn't have
const knownCommands: ValidatorFn = (c) => {
  const bad = unknownCommands(c.value ?? '', COMMAND_NAMES);
  return bad.length ? { unknownCommands: bad } : null;
};

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-admin-about',
  styleUrl: './admin-about.scss',
  templateUrl: './admin-about.html',
})
export class AdminAbout implements OnInit {
  private fb = inject(FormBuilder);
  private aboutService = inject(AboutService);

  isLoading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  aboutForm = this.fb.group({
    fullName: ['', [Validators.required]],
    title: ['', [Validators.required]],
    tagline: [''],
    bio: ['', [Validators.required]],
    faviconUrl: [''],
    email: [''],
    phone: [''],
    location: [''],
    linkedinUrl: ['', Validators.pattern(/^https:\/\/\S+$/)],
    githubUrl: ['', Validators.pattern(/^https:\/\/\S+$/)],
    contactLinks: this.fb.array<FormGroup>([]),
    texts: this.fb.group(Object.fromEntries(Object.keys(SITE_TEXTS).map((k) => [k, ['', knownCommands]]))),
  });
  // contact notes sit next to their contact field and the popup repeat is a select, not in this list
  siteTexts = Object.entries(SITE_TEXTS)
    .filter(([key]) => !key.startsWith('contact.note.') && key !== 'consent.repeat')
    .map(([key, t]) => ({ key, ...t }));
  github = PROFILE.github; // placeholder: used while the GitHub URL field is empty
  consentRepeat = Object.entries(CONSENT_REPEAT);
  formValue = toSignal(this.aboutForm.valueChanges, { initialValue: this.aboutForm.value });

  ngOnInit() {
    this.aboutService.get().subscribe({
      next: (data) => {
        if (data) {
          this.aboutForm.patchValue({
            fullName: data.fullName,
            title: data.title,
            tagline: data.tagline ?? '',
            bio: data.bio,
            faviconUrl: data.faviconUrl ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            location: data.location ?? '',
            linkedinUrl: data.linkedinUrl ?? '',
            githubUrl: data.githubUrl ?? '',
            texts: data.texts ?? {},
          });
          (data.contactLinks ?? []).forEach((l) => this.addContactLink(l.label, l.value));
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load about data:', err);
        this.isLoading.set(false);
      },
    });
  }

  addContactLink(label = '', value = '') {
    this.aboutForm.controls.contactLinks.push(
      this.fb.group({
        label: [label, Validators.maxLength(30)],
        value: [value, Validators.maxLength(300)],
      }),
    );
  }

  textControl(key: string) {
    // array path: a string path would split the dotted key
    return this.aboutForm.controls.texts.get([key]) as FormControl<string>;
  }

  note(key: 'email' | 'github' | 'linkedin' | 'location') {
    return this.textControl(`contact.note.${key}`);
  }

  removeContactLink(i: number) {
    this.aboutForm.controls.contactLinks.removeAt(i);
  }

  async onImage(event: Event, field: keyof typeof IMAGE_SIZE) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.aboutForm.patchValue({ [field]: await resize(file, IMAGE_SIZE[field]) });
      this.errorMessage.set(null);
    } catch {
      this.errorMessage.set(Messages[MessageKey.IMAGE_LOAD_FAILED]);
    }
  }

  onSubmit() {
    if (this.aboutForm.invalid) {
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);

    const formValue = this.aboutForm.value as any;
    formValue.contactLinks = formValue.contactLinks
      .map((l: { label: string; value: string }) => ({ label: l.label.trim(), value: l.value.trim() }))
      .filter((l: { label: string; value: string }) => l.label && l.value);

    this.aboutService.save(formValue).subscribe({
      next: () => {
        this.successMessage.set('About section saved successfully!');
      },
      error: (err) => {
        this.errorMessage.set('Failed to save. Please try again.');
        console.error(err);
      },
    });
  }
}

// Scales the image down to fit `size` and re-encodes it as a PNG data URL (keeps icon transparency)
async function resize(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
