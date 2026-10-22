import { Component, input } from '@angular/core';
import { Line } from './commands';

// Renders one line of colored/linked segments. Used by the terminal and file previews.
@Component({
  selector: 'app-output-line',
  template: `@for (s of line(); track $index) {
    @if (s.href) {
      <a [href]="s.href" target="_blank" rel="noopener" [class]="s.tone ? 't-' + s.tone : ''">{{
        s.text
      }}</a>
    } @else if (s.swatch) {
      <span class="swatch" [style.background]="s.swatch" aria-hidden="true">{{ s.text }}</span>
    } @else {
      <span [class]="s.tone ? 't-' + s.tone : ''">{{ s.text }}</span>
    }
  }`,
  host: { class: 'output-line' },
})
export class OutputLine {
  line = input.required<Line>();
}
