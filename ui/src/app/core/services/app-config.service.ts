import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: { apiUrl: string } | null = null;

  private http = inject(HttpClient);

  load(): Promise<void> {
    return firstValueFrom(
      this.http.get<{ apiUrl: string }>('/assets/config.json'),
    ).then((cfg) => {
      this.config = cfg;
    });
  }

  get apiUrl(): string {
    if (!this.config) throw new Error('Config not loaded');
    return this.config.apiUrl;
  }
}
