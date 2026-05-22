import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChecklistAlertService {
  readonly uncheckedCount = signal(0);
  private readonly openSubject = new Subject<void>();

  readonly openRequested$ = this.openSubject.asObservable();

  setUncheckedCount(count: number): void {
    this.uncheckedCount.set(Math.max(0, count));
  }

  requestOpen(): void {
    this.openSubject.next();
  }

  reset(): void {
    this.uncheckedCount.set(0);
  }
}
