import { Component, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { CvService } from '../../core/services/cv.service';

type Step = 'q1' | 'q2' | 'open' | 'nope';

// The "important" file: asks twice whether the visitor is really that curious, then offers the CV.
@Component({
  selector: 'app-important',
  template: `
    <dialog #dialog aria-labelledby="important-q" (cancel)="no()">
      @if (step() === 'q1' || step() === 'q2') {
        <p id="important-q" class="text">
          {{ content.text(step() === 'q1' ? 'important.q1' : 'important.q2') }}
        </p>
        <div class="actions">
          <button type="button" class="yes" (click)="yes()">
            {{ content.text(step() === 'q1' ? 'important.yes1' : 'important.yes2') }}
          </button>
          <button type="button" (click)="no()">{{ content.text('important.no') }}</button>
        </div>
      }
    </dialog>

    <article class="doc">
      <h1>important</h1>
      @switch (step()) {
        @case ('open') {
          <p class="text">{{ content.text('important.reveal') }}</p>
          @if (cv() === undefined) {
            <p class="meta">checking...</p>
          } @else if (cv()) {
            <a class="download" [href]="downloadUrl" download>{{ content.text('important.download') }}</a>
            <p class="meta">{{ cv()!.filename }}</p>
          } @else {
            <p class="meta">No CV uploaded yet.</p>
          }
        }
        @case ('nope') {
          <p class="text">{{ content.text('important.nope') }}</p>
          <button type="button" class="again" (click)="restart()">I changed my mind</button>
        }
      }
    </article>
  `,
  styles: `
    dialog {
      max-width: min(28rem, calc(100vw - 32px));
      padding: 1.5rem;
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
    dialog p {
      margin: 0 0 1.25rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    button,
    .download {
      display: inline-block;
      padding: 0.55rem 1.1rem;
      border: 1px solid var(--color-line);
      border-radius: var(--radius);
      background: var(--color-surface-2);
      color: var(--color-ink);
      font: inherit;
      font-family: var(--font-mono);
      text-decoration: none;
    }
    .yes,
    .download {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg);
      font-weight: 700;
    }
    .again {
      font-size: 0.8rem;
    }
  `,
})
export class ImportantComponent {
  protected content = inject(ContentService);
  private cvService = inject(CvService);
  private dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly downloadUrl = this.cvService.downloadUrl;
  step = signal<Step>('q1');
  // undefined while loading, null when no CV is uploaded
  cv = toSignal(
    this.cvService.info().pipe(
      catchError(() => of(null)),
    ),
  );

  constructor() {
    // the dialog is open exactly while a question is being asked
    afterRenderEffect(() => {
      const asking = this.step() === 'q1' || this.step() === 'q2';
      const dialog = this.dialogRef().nativeElement;
      if (asking && !dialog.open) dialog.showModal();
      if (!asking && dialog.open) dialog.close();
    });
  }

  yes() {
    this.step.update((s) => (s === 'q1' ? 'q2' : 'open'));
  }

  no() {
    this.step.set('nope');
  }

  restart() {
    this.step.set('q1');
  }
}
