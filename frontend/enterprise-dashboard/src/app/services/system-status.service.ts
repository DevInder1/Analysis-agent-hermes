import { Injectable, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { LocalDataService } from './local-data.service';

@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  readonly hermesOnline = signal<boolean | null>(null);
  readonly localApiOnline = signal<boolean | null>(null);

  constructor(private readonly local: LocalDataService) {}

  async refresh(): Promise<void> {
    const [hermes, local] = await Promise.all([
      this.pingHermes(),
      this.local.checkLocalApi(),
    ]);
    this.hermesOnline.set(hermes);
    this.localApiOnline.set(local);
  }

  private async pingHermes(): Promise<boolean> {
    try {
      const res = await fetch(`${environment.hermesApiUrl}/health`, {
        headers: environment.hermesApiKey
          ? { Authorization: `Bearer ${environment.hermesApiKey}` }
          : {},
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
