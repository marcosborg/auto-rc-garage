import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, chevronBackOutline, chevronForwardOutline, timeOutline } from 'ionicons/icons';
import { Subscription, finalize } from 'rxjs';
import { PlanningIntervention, PlanningInterventionStatus } from '../../core/models/workshop.models';
import { PlanningSyncService } from '../../core/services/planning-sync.service';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

type PlanningViewMode = 'day' | 'week';
type PlanningStatusFilter = PlanningInterventionStatus | '';

@Component({
  selector: 'app-planning-agenda-page',
  templateUrl: './planning-agenda.page.html',
  styleUrls: ['./planning-agenda.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonItem,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class PlanningAgendaPage implements OnDestroy {
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly planningSync = inject(PlanningSyncService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  interventions: PlanningIntervention[] = [];
  mode: PlanningViewMode = 'day';
  status: PlanningStatusFilter = '';
  anchorDate = new Date();
  loading = false;

  private readonly syncSubscription: Subscription;

  constructor() {
    addIcons({ calendarOutline, chevronBackOutline, chevronForwardOutline, timeOutline });
    this.syncSubscription = this.planningSync.interventionUpdated$.subscribe((intervention) => {
      this.patchIntervention(intervention);
    });
  }

  ngOnDestroy(): void {
    this.syncSubscription.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(event?: CustomEvent): void {
    const period = this.period();
    this.loading = !event;
    this.workshopApi
      .getMyPlanningAgenda({
        start_date: this.formatApiDate(period.start),
        end_date: this.formatApiDate(period.end),
        status: this.status,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          event?.detail.complete();
        }),
      )
      .subscribe({
        next: (res) => (this.interventions = res.data),
        error: async (err) => {
          await this.presentToast(this.errorMessage(err, 'Não foi possível carregar a planificação.'), 'danger');
        },
      });
  }

  onModeChange(value: string | number | null | undefined): void {
    this.mode = value === 'week' ? 'week' : 'day';
    this.load();
  }

  onStatusChange(value: string | number | null | undefined): void {
    const allowed: PlanningStatusFilter[] = ['', 'planned', 'in_progress', 'completed', 'cancelled'];
    this.status = allowed.includes(value as PlanningStatusFilter) ? (value as PlanningStatusFilter) : '';
    this.load();
  }

  previousPeriod(): void {
    this.shiftPeriod(-1);
  }

  nextPeriod(): void {
    this.shiftPeriod(1);
  }

  goToday(): void {
    this.anchorDate = new Date();
    this.load();
  }

  openIntervention(intervention: PlanningIntervention): void {
    this.router.navigate(['/workshop/planning', intervention.id]);
  }

  periodLabel(): string {
    const { start, end } = this.period();
    if (this.mode === 'day') {
      return start.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
    }

    return `${start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
    })}`;
  }

  periodRange(intervention: PlanningIntervention): string {
    const start = this.formatDisplayDate(intervention.planned_start_date);
    const end = this.formatDisplayDate(intervention.planned_end_date);
    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  }

  statusColor(intervention: PlanningIntervention): string {
    if (intervention.my_work_in_progress) {
      return 'primary';
    }

    if (this.isOverdue(intervention)) {
      return 'danger';
    }

    const colors: Record<PlanningInterventionStatus, string> = {
      planned: 'medium',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'dark',
    };

    return colors[intervention.status];
  }

  cardClass(intervention: PlanningIntervention): Record<string, boolean> {
    return {
      'in-progress': intervention.my_work_in_progress,
      overdue: this.isOverdue(intervention),
    };
  }

  isOverdue(intervention: PlanningIntervention): boolean {
    if (intervention.status === 'completed' || intervention.status === 'cancelled' || !intervention.planned_end_date) {
      return false;
    }

    return intervention.planned_end_date < this.formatApiDate(new Date());
  }

  trackByIntervention(_: number, intervention: PlanningIntervention): number {
    return intervention.id;
  }

  private shiftPeriod(direction: -1 | 1): void {
    const date = new Date(this.anchorDate);
    date.setDate(date.getDate() + direction * (this.mode === 'week' ? 7 : 1));
    this.anchorDate = date;
    this.load();
  }

  private period(): { start: Date; end: Date } {
    const start = this.startOfDay(this.anchorDate);
    if (this.mode === 'day') {
      return { start, end: new Date(start) };
    }

    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private formatApiDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDisplayDate(value: string | null): string {
    if (!value) {
      return 'Sem data';
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  private patchIntervention(updated: PlanningIntervention): void {
    this.interventions = this.interventions.map((intervention) => (intervention.id === updated.id ? updated : intervention));
  }

  private errorMessage(err: unknown, fallback: string): string {
    const httpError = err as { status?: number; error?: { message?: string } };
    if (httpError.status === 401) {
      return 'Sessão expirada. Inicie sessão novamente.';
    }

    if (httpError.status === 403) {
      return 'Não tem permissão para consultar esta planificação.';
    }

    return httpError.error?.message ?? fallback;
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toast.create({ message, duration: 2000, color });
    await toast.present();
  }
}
