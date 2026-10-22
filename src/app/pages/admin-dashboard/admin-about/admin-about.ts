import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PROFILE } from '../../../core/constants/profile';
import { AboutService } from '../../../core/services/about.service';
import { ProjectService } from '../../../core/services/project.service';
import { CvInfo, CvService } from '../../../core/services/cv.service';
import { Skill } from '../../../core/models/about.model';
import { skillList } from '../../../terminal/portfolio-fs';
import { MessageKey, Messages } from '../../../core/constants/messages';
import { CONSENT_REPEAT, SITE_TEXTS } from '../../../core/constants/site-texts';

// Longest side in px. Images are stored inline in the DB, so keep them small.
const IMAGE_SIZE = { faviconUrl: 64 };

// Site texts edited with a select instead of a textarea
const SELECT_TEXTS = ['consent.repeat', 'prank.minutes'];
const PRANK_MINUTES = [1, 3, 5, 10, 15];

// The About record is edited across several admin pages (route data `section`);
// each page shows its part of the form, and Save always sends the whole record.
type Section = 'profile' | 'contact' | 'skills' | 'texts' | 'fun';
const SECTION_TITLES: Record<Section, string> = {
  profile: 'About',
  contact: 'Contact info',
  skills: 'Skills',
  texts: 'Page texts',
  fun: 'Popup & easter egg',
};

// Which page lists a site text, by key prefix (anything else goes to Page texts)
function textSection(key: string): Section {
  if (key.startsWith('home.')) return 'profile';
  if (key.startsWith('contact.')) return 'contact';
  if (key.startsWith('skills.')) return 'skills';
  if (key.startsWith('consent.') || key.startsWith('prank.') || key.startsWith('important.')) return 'fun';
  return 'texts';
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-admin-about',
  styleUrl: './admin-about.scss',
  templateUrl: './admin-about.html',
})
export class AdminAbout implements OnInit {
  private fb = inject(FormBuilder);
  private aboutService = inject(AboutService);
  private projectService = inject(ProjectService);
  private cvService = inject(CvService);

  isLoading = signal(true);
  // CV behind the "important" file; uploaded on its own, not with Save
  cv = signal<CvInfo | null>(null);
  cvUrl = this.cvService.downloadUrl;
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
    skills: this.fb.array<FormGroup>([]),
    texts: this.fb.group(Object.fromEntries(Object.keys(SITE_TEXTS).map((k) => [k, '']))),
  });
  protected section: Section = inject(ActivatedRoute).snapshot.data['section'] ?? 'profile';
  protected title = SECTION_TITLES[this.section];
  // this page's texts; contact notes sit next to their field and selects are rendered separately
  siteTexts = Object.entries(SITE_TEXTS)
    .filter(([key]) => !key.startsWith('contact.note.') && !SELECT_TEXTS.includes(key))
    .filter(([key]) => textSection(key) === this.section)
    .map(([key, t]) => ({ key, ...t }));
  github = PROFILE.github; // placeholder: used while the GitHub URL field is empty
  consentRepeat = Object.entries(CONSENT_REPEAT);
  prankMinutes = PRANK_MINUTES;
  formValue = toSignal(this.aboutForm.valueChanges, { initialValue: this.aboutForm.value });

  ngOnInit() {
    this.cvService.info().subscribe({ next: (info) => this.cv.set(info), error: () => this.cv.set(null) });
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
        if (data?.skills?.length) {
          data.skills.forEach((s) => this.addSkill(s.name, s.description));
        } else {
          // no list saved yet: start from what the site shows now (techs from the projects)
          this.projectService
            .getAll()
            .subscribe((projects) =>
              skillList(null, projects).forEach((s) => this.addSkill(s.name, s.description)),
            );
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

  note(key: 'email' | 'phone' | 'github' | 'linkedin' | 'location') {
    return this.textControl(`contact.note.${key}`);
  }

  removeContactLink(i: number) {
    this.aboutForm.controls.contactLinks.removeAt(i);
  }

  addSkill(name = '', description = '') {
    this.aboutForm.controls.skills.push(
      this.fb.group({
        name: [name, Validators.maxLength(40)],
        description: [description, Validators.maxLength(200)],
      }),
    );
  }

  removeSkill(i: number) {
    this.aboutForm.controls.skills.removeAt(i);
  }

  async onCv(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.successMessage.set(null);
    this.errorMessage.set(null);
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
      this.errorMessage.set(Messages[MessageKey.CV_INVALID]);
      input.value = '';
      return;
    }
    // base64 of the raw bytes: drop the "data:application/pdf;base64," prefix
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    this.cvService.upload(file.name, dataUrl.slice(dataUrl.indexOf(',') + 1)).subscribe({
      next: (info) => {
        this.cv.set(info);
        this.successMessage.set(Messages[MessageKey.CV_UPLOADED]);
        input.value = '';
      },
      error: () => this.errorMessage.set(Messages[MessageKey.CV_UPLOAD_FAILED]),
    });
  }

  removeCv() {
    this.cvService.remove().subscribe(() => this.cv.set(null));
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
    formValue.skills = formValue.skills
      .map((s: Skill) => ({ name: s.name.trim(), description: s.description.trim() }))
      .filter((s: Skill) => s.name);

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
