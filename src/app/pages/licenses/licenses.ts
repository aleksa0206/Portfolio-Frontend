import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ContentService } from '../../core/services/content.service';

@Component({
  imports: [SlicePipe],
  selector: 'app-licenses',
  styleUrl: './licenses.scss',
  templateUrl: './licenses.html',
})
export class LicensesComponent {
  protected content = inject(ContentService);
}
