import { Component, DestroyRef, Service, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { environment } from '../environments/environment';
import { ContentService } from './core/services/content.service';

const LOCK_MS = 8000; // how long the site stays "taken over" before it lets go
const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];

// Shared state of the idle easter egg: the host below drives it, the terminal prints it.
@Service()
export class IdlePrank {
  state = signal<'off' | 'evil' | 'kidding'>('off');
  ip = signal<string | null>(null);
}

// After N idle minutes (admin setting, 0 = off) the site turns red, the terminal shows an evil
// smiley with the visitor's own IP, and clicks are blocked for a few seconds. Then it lets go.
@Component({
  selector: 'app-idle-prank',
  template: `
    @if (prank.state() !== 'off') {
      <div class="blocker" [class.kidding]="prank.state() === 'kidding'" (click)="release()"></div>
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
  private http = inject(HttpClient);
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
        this.release();
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

    // (Re)arm when the admin setting loads or changes
    effect(() => {
      this.content.text('prank.minutes');
      this.arm();
    });
    effect(() => {
      document.documentElement.toggleAttribute('data-evil', this.prank.state() !== 'off');
    });
  }

  private arm() {
    clearTimeout(this.timer);
    const minutes = Number(this.content.text('prank.minutes'));
    if (minutes > 0) this.timer = setTimeout(() => this.trigger(), minutes * 60_000);
  }

  private async trigger() {
    // the visitor's own IP from our API; the prank still runs without it
    const res = await firstValueFrom(
      this.http.get<{ ip: string }>(`${environment.apiUrl}/whoami`).pipe(
        timeout(2000),
        catchError(() => of(null)),
      ),
    );
    this.prank.ip.set(res?.ip ?? null);
    this.prank.state.set('evil');
    this.timer = setTimeout(() => this.prank.state.set('kidding'), LOCK_MS);
  }

  release() {
    if (this.prank.state() !== 'kidding') return;
    this.prank.state.set('off');
    this.arm();
  }
}
