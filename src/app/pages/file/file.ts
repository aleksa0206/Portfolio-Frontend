import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { skillsByTech } from '../../terminal/portfolio-fs';

// skills.md and README.md in the view window, laid out like the other pages (.doc, .kv).
// Same content as the terminal versions in portfolio-fs.ts (skillsMd, SITE_README).
@Component({
  selector: 'app-file',
  template: `
    <article class="doc">
      @if (file === 'skills.md') {
        <h1>{{ content.text('skills.heading') }}</h1>
        <p class="text">{{ content.text('skills.intro') }}</p>
        <dl class="kv">
          @for (s of skills(); track s[0]) {
            <dt>{{ s[0] }}</dt>
            <dd>{{ s[1].join(', ') }}</dd>
          } @empty {
            <p class="meta">No projects listed yet.</p>
          }
        </dl>
      } @else {
        <h1>aleksa@portfolio</h1>
        <p>
          My portfolio, presented as a small Linux-style shell. The files here are a virtual
          filesystem built from the same data as the rest of the site. Nothing runs on a server.
        </p>
        <p>Start with:</p>
        <dl class="kv">
          <dt><code>ls</code></dt>
          <dd>list files</dd>
          <dt><code>cat about.md</code></dt>
          <dd>who I am</dd>
          <dt><code>cd projects</code></dt>
          <dd>what I've built</dd>
          <dt><code>help</code></dt>
          <dd>every command</dd>
        </dl>
      }
    </article>
  `,
})
export class FileComponent {
  protected content = inject(ContentService);
  protected file = inject(ActivatedRoute).snapshot.data['file'] as 'skills.md' | 'README.md';

  skills = computed(() => skillsByTech(this.content.projects()));
}
