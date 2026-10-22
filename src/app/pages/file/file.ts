import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { textLines } from '../../terminal/commands';
import { OutputLine } from '../../terminal/output-line';
import { SITE_README, skillsMd } from '../../terminal/portfolio-fs';

// Plain-text files from the terminal FS (skills.md, README.md) shown in the view window
@Component({
  imports: [OutputLine],
  selector: 'app-file',
  template: `
    <article class="doc file">
      @for (line of lines(); track $index) {
        <app-output-line [line]="line" />
      }
    </article>
  `,
  // monospace like the terminal, so the padded columns line up
  styles: `
    .file {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.55;
    }
  `,
})
export class FileComponent {
  private content = inject(ContentService);
  private file = inject(ActivatedRoute).snapshot.data['file'] as 'skills.md' | 'README.md';

  lines = computed(() =>
    textLines(this.file === 'skills.md' ? skillsMd(this.content.projects()) : SITE_README),
  );
}
