import { Component, DestroyRef, Service, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { environment } from '../environments/environment';
import { ContentService } from './core/services/content.service';

const LOCK_MS = 8000; // how long the site stays "taken over" before it lets go
const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];

// Commands that would wreck a real machine; typing one sets off the takeover
const DANGEROUS = new Set([
  'rm', 'sudo', 'su', 'dd', 'mkfs', 'shutdown', 'reboot', 'halt', 'poweroff',
  'kill', 'killall', 'chmod', 'chown', 'format', 'del',
]);

export function isMalicious(input: string): boolean {
  const s = input.trim();
  if (/:\s*\(\s*\)\s*\{/.test(s)) return true; // fork bomb :(){ :|:& };:
  const name = s.split(/\s+/)[0].replace(/^.*\//, ''); // /bin/rm -> rm
  return DANGEROUS.has(name) || name.startsWith('mkfs.');
}

// The red takeover: evil theme, evil smiley in the terminal, clicks blocked for a few seconds.
// Set off by idling (IdlePrankHost) or by a malicious terminal command.
@Service()
export class IdlePrank {
  private http = inject(HttpClient);

  state = signal<'off' | 'evil' | 'kidding'>('off');
  reason = signal<'idle' | 'malicious'>('idle');
  ip = signal<string | null>(null);

  async trigger(reason: 'idle' | 'malicious') {
    if (this.state() !== 'off') return;
    // the visitor's own IP from our API; the prank still runs without it
    const res = await firstValueFrom(
      this.http.get<{ ip: string }>(`${environment.apiUrl}/whoami`).pipe(
        timeout(2000),
        catchError(() => of(null)),
      ),
    );
    this.ip.set(res?.ip ?? null);
    this.reason.set(reason);
    this.state.set('evil');
    setTimeout(() => this.state.set('kidding'), LOCK_MS);
  }

  release() {
    if (this.state() === 'kidding') this.state.set('off');
  }
}

// Arms the idle timer (admin setting, 0 = off), blocks input while the takeover runs,
// and paints the red theme.
@Component({
  selector: 'app-idle-prank',
  template: `
    @if (prank.state() !== 'off') {
      <div class="blocker" [class.kidding]="prank.state() === 'kidding'" (click)="prank.release()"></div>
    }
  `,
  styles: `
    .blocker {
      position: fixed;
      inset: 0;
      z-index: 1000;
      cursor: not-allowed;
      background: rgb(120 0 0 / 0.12);
    }
    .kidding {
      cursor: pointer;
    }
  `,
})
export class IdlePrankHost {
  protected prank = inject(IdlePrank);
  private content = inject(ContentService);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const onActivity = (event: Event) => {
      const state = this.prank.state();
      if (state === 'evil') {
        // locked: swallow keys so nothing can be typed or tabbed to
        if (event.type === 'keydown') {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (state === 'kidding' && (event.type === 'keydown' || event.type === 'pointerdown')) {
        event.preventDefault();
        event.stopPropagation();
        this.prank.release();
        return;
      }
      if (state === 'off') this.arm();
    };
    for (const type of ACTIVITY) {
      document.addEventListener(type, onActivity, { capture: true, passive: type !== 'keydown' });
    }
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      for (const type of ACTIVITY) document.removeEventListener(type, onActivity, { capture: true });
      document.documentElement.removeAttribute('data-evil');
    });

    // (Re)arm when the admin setting loads or changes, and again after the takeover ends
    effect(() => {
      this.content.text('prank.minutes');
      if (this.prank.state() === 'off') this.arm();
      else clearTimeout(this.timer);
    });
    effect(() => {
      document.documentElement.toggleAttribute('data-evil', this.prank.state() !== 'off');
    });
  }

  private arm() {
    clearTimeout(this.timer);
    const minutes = Number(this.content.text('prank.minutes'));
    if (minutes > 0) this.timer = setTimeout(() => this.prank.trigger('idle'), minutes * 60_000);
  }
}
