import { Component, computed, inject } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { sortedEducation, yearRange } from '../../terminal/portfolio-fs';

@Component({
  selector: 'app-education',
  styleUrl: './education.scss',
  templateUrl: './education.html',
})
export class EducationComponent {
  protected content = inject(ContentService);
  protected readonly yearRange = yearRange;

  educationList = computed(() => sortedEducation(this.content.education()));
}
