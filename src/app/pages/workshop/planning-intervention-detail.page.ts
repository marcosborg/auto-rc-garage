import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Subscription, finalize, interval } from 'rxjs';
import { PlanningIntervention, PlanningWorkLog } from '../../core/models/workshop.models';
import { AuthService } from '../../core/services/auth.service';
import { PlanningSyncService } from '../../core/services/planning-sync.service';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

type PlanningAction = 'start' | 'finish' | 'complete';

@Component({
  selector: 'app-planning-intervention-detail-page',
  templateUrl: './planning-intervention-detail.page.html',
  styleUrls: ['./planning-intervention-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonSpinner,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class PlanningInterventionDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly planningSync = inject(PlanningSyncService);
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);

  intervention: PlanningIntervention | null = null;
  loading = true;
  submitting = false;
  actionError = '';
  now = new Date();

  private readonly clockSubscription: Subscription;

  constructor() {
    this.clockSubscription = interval(30000).subscribe(() => {
      this.now = new Date();
    });
  }

  ngOnDestroy(): void {
    this.clockSubscription.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.actionError = '';
    this.workshopApi
      .getPlanningIntervention(this.interventionId())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => this.applyUpdate(res.data),
        error: async (err) => {
          await this.presentToast(this.errorMessage(err, 'Não foi possível carregar o trabalho.'), 'danger');
        },
      });
  }

  get canStart(): boolean {
    return !!this.intervention
      && (this.intervention.status === 'planned' || this.intervention.status === 'in_progress')
      && !this.intervention.my_work_in_progress;
  }

  get canFinish(): boolean {
    return !!this.intervention?.my_work_in_progress;
  }

  get canComplete(): boolean {
    return !!this.intervention && this.intervention.status !== 'completed' && this.intervention.status !== 'cancelled';
  }

  get myTotalMinutes(): number {
    const userId = this.auth.user()?.id;
    if (!userId || !this.intervention) {
      return 0;
    }

    return this.intervention.work_logs
      .filter((log) => Number(log.user_id) === Number(userId))
      .reduce((total, log) => total + this.logDurationMinutes(log), 0);
  }

  startWork(): void {
    this.runAction('start');
  }

  finishWork(): void {
    this.runAction('finish');
  }

  async confirmComplete(): Promise<void> {
    if (!this.canComplete) {
      return;
    }

    const alert = await this.alert.create({
      header: 'Concluir trabalho?',
      message: 'Esta ação termina o seu cronómetro. A tarefa só fica concluída quando os restantes mecânicos já tiverem terminado os respetivos tempos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Concluir',
          role: 'destructive',
          handler: () => this.runAction('complete'),
        },
      ],
    });

    await alert.present();
  }

  vehicleLabel(intervention: PlanningIntervention): string {
    return intervention.vehicle.license || `Viatura #${intervention.vehicle.id}`;
  }

  periodLabel(intervention: PlanningIntervention): string {
    const start = this.formatDate(intervention.planned_start_date);
    const end = this.formatDate(intervention.planned_end_date);
    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  }

  statusColor(intervention: PlanningIntervention): string {
    if (intervention.my_work_in_progress) {
      return 'primary';
    }

    const colors = {
      planned: 'medium',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'dark',
    };

    return colors[intervention.status];
  }

  formatMinutes(minutes: number): string {
    if (!minutes || minutes <= 0) {
      return '0 min';
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) {
      return `${remaining} min`;
    }

    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  formatDate(value: string | null): string {
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

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('pt-PT');
  }

  trackByMechanic(_: number, mechanic: { id: number }): number {
    return mechanic.id;
  }

  trackByWorkLog(_: number, log: PlanningWorkLog): number {
    return log.id;
  }

  private interventionId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  private runAction(action: PlanningAction): void {
    if (!this.intervention) {
      return;
    }

    this.submitting = true;
    this.actionError = '';

    const request$ = {
      start: this.workshopApi.startPlanningIntervention(this.intervention.id),
      finish: this.workshopApi.finishPlanningIntervention(this.intervention.id),
      complete: this.workshopApi.completePlanningIntervention(this.intervention.id),
    }[action];

    request$
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: async (res) => {
          this.applyUpdate(res.data);
          this.planningSync.notifyInterventionUpdated(res.data);
          await this.presentToast('Ação concluída.', 'success');
        },
        error: async (err) => {
          const message = this.validationMessage(err, 'Ação não concluída.');
          this.actionError = message;
          await this.presentToast(message, 'danger', 2800);
        },
      });
  }

  private applyUpdate(data: PlanningIntervention): void {
    this.intervention = data;
    this.actionError = '';
    this.now = new Date();
  }

  logDurationMinutes(log: PlanningWorkLog): number {
    if (log.finished_at || !log.started_at) {
      return log.duration_minutes || 0;
    }

    const startedAt = new Date(log.started_at.replace(' ', 'T'));
    if (Number.isNaN(startedAt.getTime())) {
      return log.duration_minutes || 0;
    }

    const elapsed = Math.max(0, Math.floor((this.now.getTime() - startedAt.getTime()) / 60000));
    return (log.duration_minutes || 0) + elapsed;
  }

  private validationMessage(err: unknown, fallback: string): string {
    const httpError = err as { status?: number; error?: { message?: string; errors?: Record<string, string[] | string> } };
    if (httpError.status === 422) {
      const messages: string[] = [];
      Object.values(httpError.error?.errors ?? {}).forEach((value: string[] | string) => {
        if (Array.isArray(value)) {
          messages.push(...value);
          return;
        }

        messages.push(value);
      });
      return [httpError.error?.message, ...messages].filter(Boolean).join(' ') || fallback;
    }

    return this.errorMessage(err, fallback);
  }

  private errorMessage(err: unknown, fallback: string): string {
    const httpError = err as { status?: number; error?: { message?: string } };
    if (httpError.status === 401) {
      return 'Sessão expirada. Inicie sessão novamente.';
    }

    if (httpError.status === 403) {
      return 'Não tem permissão para executar este trabalho.';
    }

    return httpError.error?.message ?? fallback;
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning', duration = 1800): Promise<void> {
    const toast = await this.toast.create({ message, duration, color });
    await toast.present();
  }
}
