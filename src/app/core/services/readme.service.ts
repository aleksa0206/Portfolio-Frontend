import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Service()
export class ReadmeService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<string>>();

  // Fetches README.md of a public GitHub repo, e.g. https://github.com/user/repo
  get(repoUrl: string) {
    const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!match) {
      throw new Error(`Not a GitHub repository URL: ${repoUrl}`);
    }
    const url = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/HEAD/README.md`;
    if (!this.cache.has(url)) {
      this.cache.set(url, this.http.get(url, { responseType: 'text' }).pipe(shareReplay(1)));
    }
    return this.cache.get(url)!;
  }
}
