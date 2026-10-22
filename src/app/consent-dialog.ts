import {
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ContentService } from './core/services/content.service';

const SEEN_KEY = 'consent-seen';

function seen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

// Joke "do you agree not to do anything stupid" popup, shown each time the site is opened
// (sessionStorage: survives a refresh, gone when the tab is closed).
// "I don't agree" disappears as soon as the visitor tries to reach it.
@Component({
  selector: 'app-consent-dialog',
  template: `
    <dialog #dialog aria-labelledby="consent-question" (cancel)="$event.preventDefault()">
      @if (agreed()) {
        <button #closeBtn type="button" class="close" aria-label="Close" (click)="close()">×</button>
      }
      <p id="consent-question" class="text">{{ content.text('consent.question') }}</p>
      @if (agreed()) {
        <p class="text after" role="status">{{ content.text('consent.after') }}</p>
      } @else {
        <div class="actions">
          <button #agreeBtn type="button" class="agree" (click)="agree()">
            {{ content.text('consent.agree') }}
          </button>
          @if (!disagreeGone()) {
            <button
              type="button"
              (pointerenter)="runAway()"
              (pointerdown)="runAway()"
              (focus)="runAway()"
            >
              {{ content.text('consent.disagree') }}
            </button>
          }
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      position: relative;
      max-width: min(30rem, calc(100vw - 32px));
      padding: 1.5rem 1.5rem 1.25rem;
      border: 1px solid var(--color-line);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.6);
    }
    p {
      margin: 0 0 1.25rem;
      line-height: 1.6;
    }
    .after {
      color: var(--color-accent);
      margin: 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    button {
      padding: 0.55rem 1.1rem;
      border: 1px solid var(--color-line);
      border-radius: var(--radius);
      background: var(--color-surface-2);
      color: var(--color-ink);
      font: inherit;
    }
    .agree {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg);
      font-weight: 700;
    }
    .close {
      position: absolute;
      top: 0.4rem;
      right: 0.5rem;
      padding: 0.1rem 0.55rem;
      font-size: 1.2rem;
      line-height: 1;
    }
  `,
})
export class ConsentDialog {
  protected content = inject(ContentService);
  private dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private agreeRef = viewChild<ElementRef<HTMLButtonElement>>('agreeBtn');
  private closeRef = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  agreed = signal(false);
  disagreeGone = signal(false);

  constructor() {
    // Open once content (and any admin-edited text) has loaded, so the text doesn't swap mid-read
    afterRenderEffect(() => {
      if (this.content.isLoading() || seen()) return;
      untracked(() => {
        const dialog = this.dialogRef().nativeElement;
        if (!dialog.open) dialog.showModal();
      });
    });
  }

  agree() {
    this.agreed.set(true);
    // the agree button is gone now; move focus to the X that replaced it
    setTimeout(() => this.closeRef()?.nativeElement.focus());
  }

  runAway() {
    this.disagreeGone.set(true);
    // keep keyboard focus inside the dialog once the button is gone
    queueMicrotask(() => this.agreeRef()?.nativeElement.focus());
  }

  close() {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // storage blocked: the popup just shows again on refresh
    }
    this.dialogRef().nativeElement.close();
  }
}
