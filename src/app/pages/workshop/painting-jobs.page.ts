import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBadge, IonCard, IonCardContent, IonContent, IonItem, IonLabel, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { finalize } from 'rxjs';
import { PaintingJobStatus, PaintingJobSummary } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-painting-jobs-page',
  templateUrl: './painting-jobs.page.html',
  styleUrls: ['./painting-jobs.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonBadge, IonItem, IonSpinner, IonRefresher, IonRefresherContent],
})
export class PaintingJobsPage {
  private readonly api = inject(WorkshopApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  jobs: PaintingJobSummary[] = [];
  status: PaintingJobStatus = 'open';
  loading = false;

  ionViewWillEnter(): void { this.load(); }

  load(event?: CustomEvent): void {
    this.loading = !event;
    this.api.getPaintingJobs(this.status).pipe(finalize(() => { this.loading = false; event?.detail.complete(); })).subscribe({
      next: (res) => this.jobs = res.data,
      error: async () => { const toast = await this.toast.create({ message: 'Não foi possível carregar as fichas de pintura.', color: 'danger', duration: 1800 }); await toast.present(); },
    });
  }

  setStatus(value: string | number | null | undefined): void { this.status = value === 'completed' ? 'completed' : 'open'; this.load(); }
  open(job: PaintingJobSummary): void { this.router.navigate(['/workshop/painting', job.id]); }
  formatDate(value: string | null): string { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-PT') : '—'; }
}
