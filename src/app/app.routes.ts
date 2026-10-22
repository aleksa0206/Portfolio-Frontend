import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EducationComponent } from './pages/education/education';
import { LicensesComponent } from './pages/licenses/licenses';
import { ProjectsComponent } from './pages/projects/projects';
import { ContactComponent } from './pages/contact/contact';
import { FileComponent } from './pages/file/file';
import { AdminLogin } from './pages/admin-login/admin-login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AdminEducation } from './pages/admin-dashboard/admin-education/admin-education';
import { AdminLicense } from './pages/admin-dashboard/admin-license/admin-license';
import { AdminProject } from './pages/admin-dashboard/admin-project/admin-project';
import { AdminAbout } from './pages/admin-dashboard/admin-about/admin-about';
import { AdminContact } from './pages/admin-dashboard/admin-contact/admin-contact';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'education', component: EducationComponent },
  { path: 'licenses', component: LicensesComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'projects/:slug', component: ProjectsComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'skills', component: FileComponent, data: { file: 'skills.md' } },
  { path: 'readme', component: FileComponent, data: { file: 'README.md' } },
  { path: 'admin/login', component: AdminLogin },
  {
    path: 'admin/dashboard',
    component: AdminDashboard,
    canActivate: [authGuard],
    children: [
      { path: 'about', component: AdminAbout },
      { path: 'education', component: AdminEducation },
      { path: 'licenses', component: AdminLicense },
      { path: 'projects', component: AdminProject },
      { path: 'messages', component: AdminContact },
      { path: '', redirectTo: 'about', pathMatch: 'full' },
    ],
  },
];