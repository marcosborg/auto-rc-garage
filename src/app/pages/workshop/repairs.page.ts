import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carSportOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { RepairListItem } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-repairs-page',
  templateUrl: './repairs.page.html',
  styleUrls: ['./repairs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonCard,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonItem,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class RepairsPage {
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  repairs: RepairListItem[] = [];
  status: 'open' | 'all' = 'open';
  search = '';
  loading = false;

  constructor() {
    addIcons({ carSportOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(event?: CustomEvent): void {
    this.loading = !event;
    this.workshopApi
      .getRepairs(this.status, this.search)
      .pipe(
        finalize(() => {
          this.loading = false;
          event?.detail.complete();
        }),
      )
      .subscribe({
        next: (res) => (this.repairs = res.data),
        error: async () => {
          const toast = await this.toast.create({
            message: 'Não foi possível carregar as intervenções.',
            duration: 1800,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  openRepair(repair: RepairListItem): void {
    this.router.navigate(['/workshop/repairs', repair.id]);
  }

  coverPhotoSrc(repair: RepairListItem): string {
    const photo = repair.cover_photo || repair.vehicle?.initial_photos?.[0] || null;
    return photo?.url || photo?.thumb || '';
  }

  formatDuration(minutes: number | null): string {
    if (minutes === null) {
      return '';
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  formatListDate(value: string | null): string {
    if (!value) {
      return 'Sem data';
    }

    return new Date(value.replace(' ', 'T')).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  onStatusChange(value: string | number | null | undefined): void {
    this.status = value === 'all' ? 'all' : 'open';
    this.load();
  }
}
