import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { PlanningIntervention } from '../models/workshop.models';

@Injectable({ providedIn: 'root' })
export class PlanningSyncService {
  private readonly interventionUpdatedSubject = new Subject<PlanningIntervention>();

  readonly interventionUpdated$: Observable<PlanningIntervention> = this.interventionUpdatedSubject.asObservable();

  notifyInterventionUpdated(intervention: PlanningIntervention): void {
    this.interventionUpdatedSubject.next(intervention);
  }
}
