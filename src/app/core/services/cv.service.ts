import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CvInfo {
  filename: string;
  updatedAt: string;
}

@Service()
export class CvService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cv`;

  // plain link, so the browser downloads the PDF itself
  readonly downloadUrl = this.apiUrl;

  info() {
    return this.http.get<CvInfo>(`${this.apiUrl}/info`);
  }

  // data: base64 of the PDF bytes
  upload(filename: string, data: string) {
    return this.http.put<CvInfo>(this.apiUrl, { filename, data });
  }

  remove() {
    return this.http.delete<void>(this.apiUrl);
  }
}
