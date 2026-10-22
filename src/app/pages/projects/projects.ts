import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ReadmeService } from '../../core/services/readme.service';
import { MessageKey, Messages } from '../../core/constants/messages';
import { slugify, techList } from '../../terminal/portfolio-fs';
import { textLines } from '../../terminal/commands';
import { OutputLine } from '../../terminal/output-line';

@Component({
  imports: [RouterLink, OutputLine],
  selector: 'app-projects',
  styleUrl: './projects.scss',
  templateUrl: './projects.html',
})
export class ProjectsComponent {
  protected content = inject(ContentService);
  private readmeService = inject(ReadmeService);
  protected readonly slugify = slugify;
  protected readonly techList = techList;
  protected readonly readmeFailed = Messages[MessageKey.README_LOAD_FAILED];

  slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('slug'))));

  // /projects shows the first project, /projects/:slug the requested one
  selected = computed(() => {
    const list = this.content.projects();
    const slug = this.slug();
    return slug ? (list.find((p) => slugify(p.title) === slug) ?? null) : (list[0] ?? null);
  });

  readme = rxResource({
    params: () => this.selected()?.repoUrl || undefined,
    stream: ({ params }) => this.readmeService.get(params),
  });
  readmeLines = computed(() => (this.readme.hasValue() ? textLines(this.readme.value()) : []));
}
