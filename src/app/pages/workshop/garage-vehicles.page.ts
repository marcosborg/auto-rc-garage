import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carSportOutline, chevronDownOutline, chevronForwardOutline, openOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { GarageVehicle, GarageVehicleRepair } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-garage-vehicles-page',
  templateUrl: './garage-vehicles.page.html',
  styleUrls: ['./garage-vehicles.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class GarageVehiclesPage {
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  vehicles: GarageVehicle[] = [];
  expandedVehicleId: number | null = null;
  search = '';
  loading = false;
  page = 1;
  lastPage = 1;
  readonly perPage = 10;

  constructor() {
    addIcons({ carSportOutline, chevronDownOutline, chevronForwardOutline, openOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(event?: CustomEvent): void {
    this.fetchVehicles(1, false, event);
  }

  loadMore(event: CustomEvent): void {
    if (this.loading || !this.hasMore) {
      event.detail.complete();
      return;
    }

    this.fetchVehicles(this.page + 1, true, event);
  }

  onSearchChange(): void {
    this.expandedVehicleId = null;
    this.load();
  }

  get hasMore(): boolean {
    return this.page < this.lastPage;
  }

  private fetchVehicles(page: number, append: boolean, event?: CustomEvent): void {
    this.loading = !append && !event;
    this.workshopApi
      .getGarageVehicles(this.search, page, this.perPage)
      .pipe(
        finalize(() => {
          this.loading = false;
          event?.detail.complete();
        }),
      )
      .subscribe({
        next: (res) => {
          this.vehicles = append ? [...this.vehicles, ...res.data] : res.data;
          this.page = res.meta.current_page;
          this.lastPage = res.meta.last_page;
          if (this.expandedVehicleId && !this.vehicles.some((vehicle) => vehicle.id === this.expandedVehicleId)) {
            this.expandedVehicleId = null;
          }
        },
        error: async () => {
          const toast = await this.toast.create({
            message: 'Nao foi possivel carregar as viaturas em oficina.',
            duration: 1800,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  toggleVehicle(vehicle: GarageVehicle): void {
    this.expandedVehicleId = this.expandedVehicleId === vehicle.id ? null : vehicle.id;
  }

  openRepair(repair: GarageVehicleRepair, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/workshop/repairs', repair.id]);
  }

  vehicleLabel(vehicle: GarageVehicle): string {
    return [vehicle.license || vehicle.foreign_license, vehicle.brand, vehicle.model].filter(Boolean).join(' ') || `Viatura #${vehicle.id}`;
  }

  coverPhotoSrc(vehicle: GarageVehicle): string {
    return vehicle.cover_photo?.url || vehicle.cover_photo?.thumb || '';
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value.replace(' ', 'T')).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  formatDuration(minutes: number | null): string {
    if (minutes === null) {
      return '-';
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  trackByVehicle(_: number, vehicle: GarageVehicle): number {
    return vehicle.id;
  }

  trackByRepair(_: number, repair: GarageVehicleRepair): number {
    return repair.id;
  }
}
