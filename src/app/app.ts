import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ContentService } from './core/services/content.service';
import { PROFILE } from './core/constants/profile';
import { TerminalComponent } from './terminal/terminal';
import { MatrixRain } from './matrix-rain';
import { ConsentDialog } from './consent-dialog';
import { IdlePrank, IdlePrankHost } from './idle-prank';
import { slugify } from './terminal/portfolio-fs';

// Public routes, shown as workspaces in the top panel and as files in the sidebar
const WORKSPACES = [
  { route: '/', file: 'about.md' },
  { route: '/projects', file: 'projects/' },
  { route: '/education', file: 'education.md' },
  { route: '/licenses', file: 'certificates/' },
  { route: '/contact', file: 'contact.txt' },
];

type TerminalState = 'open' | 'max' | 'closed';

const formatClock = () =>
  new Date()
    .toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', '');

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TerminalComponent, MatrixRain, ConsentDialog, IdlePrankHost],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private router = inject(Router);
  protected content = inject(ContentService);
  protected readonly workspaces = WORKSPACES;
  protected readonly slugify = slugify;
  protected readonly host = `${PROFILE.user}@${PROFILE.host}`;

  url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: inject(Location).path() || '/' },
  );
  isAdmin = computed(() => this.url().startsWith('/admin'));
  viewTitle = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    if (path.startsWith('/projects/')) return `~${path}/`;
    const ws = WORKSPACES.find((w) => w.route === path);
    return ws ? `~/${ws.file}` : '~';
  });

  terminalState = signal<TerminalState>('open');
  sidebarOpen = signal(false);
  clock = signal(formatClock());

  constructor() {
    const timer = setInterval(() => this.clock.set(formatClock()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // (Re)load public content whenever the desktop is shown, e.g. after editing in the admin panel
    effect(() => {
      if (!this.isAdmin()) untracked(() => this.content.load());
    });
    effect(() => {
      this.url();
      untracked(() => this.sidebarOpen.set(false));
    });
    // The idle easter egg prints into the terminal, so make sure it is visible
    const prank = inject(IdlePrank);
    effect(() => {
      if (prank.state() === 'evil') untracked(() => this.terminalState.update((s) => (s === 'closed' ? 'open' : s)));
    });
    // Tab icon uploaded in the admin panel replaces the static favicon.svg
    effect(() => {
      const icon = this.content.about()?.faviconUrl;
      if (icon) document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', icon);
    });
  }

  showTerminal(terminal: TerminalComponent) {
    this.terminalState.update((s) => (s === 'closed' ? 'open' : s));
    setTimeout(() => terminal.focus());
  }

  runInTerminal(terminal: TerminalComponent, command: string) {
    this.showTerminal(terminal);
    terminal.run(command);
  }

  toggleMaximize() {
    this.terminalState.update((s) => (s === 'max' ? 'open' : 'max'));
  }
}
