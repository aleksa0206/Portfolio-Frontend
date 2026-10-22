import { Service, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { About } from '../models/about.model';
import { Education } from '../models/education.model';
import { License } from '../models/license.model';
import { Project } from '../models/project.model';
import { PROFILE } from '../constants/profile';
import { AboutService } from './about.service';
import { EducationService } from './education.service';
import { LicenseService } from './license.service';
import { ProjectService } from './project.service';

// Loads all public content and shares it between the terminal and the pages.
@Service()
export class ContentService {
  private aboutService = inject(AboutService);
  private projectService = inject(ProjectService);
  private educationService = inject(EducationService);
  private licenseService = inject(LicenseService);

  about = signal<About | null>(null);
  projects = signal<Project[]>([]);
  education = signal<Education[]>([]);
  licenses = signal<License[]>([]);
  isLoading = signal(true);

  location = computed(() => this.about()?.location || PROFILE.location);

  // Called on startup and again after leaving the admin panel, so edits show up immediately.
  load() {
    forkJoin({
      about: this.aboutService.get().pipe(catchError(() => of(null))),
      projects: this.projectService.getAll().pipe(catchError(() => of([]))),
      education: this.educationService.getAll().pipe(catchError(() => of([]))),
      licenses: this.licenseService.getAll().pipe(catchError(() => of([]))),
    }).subscribe((data) => {
      this.about.set(data.about);
      this.projects.set(data.projects);
      this.education.set(data.education);
      this.licenses.set(data.licenses);
      this.isLoading.set(false);
    });
  }
}
