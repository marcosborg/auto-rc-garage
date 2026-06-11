import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonThumbnail,
  ToastController,
} from '@ionic/angular/standalone';
import { finalize } from 'rxjs';
import { VehicleLookup } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-new-intervention-page',
  templateUrl: './new-intervention.page.html',
  styleUrls: ['./new-intervention.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonThumbnail,
  ],
})
export class NewInterventionPage {
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  search = '';
  workType: 'workshop' | 'painting' = 'workshop';
  vehicles: VehicleLookup[] = [];
  loading = false;

  ionViewWillEnter(): void {
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading = true;
    this.workshopApi
      .searchVehicles(this.search)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => (this.vehicles = res.data),
      });
  }

  create(vehicleId: number): void {
    this.loading = true;
    this.workshopApi
      .createIntervention(vehicleId, this.workType)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: async (res) => {
          const repairId = res?.data?.id;
          if (!repairId) {
            const toast = await this.toast.create({
              message: 'Intervenção criada mas sem identificador retornado.',
              duration: 2000,
              color: 'warning',
            });
            await toast.present();
            return;
          }

          await this.router.navigateByUrl(`/workshop/repairs/${repairId}`, { replaceUrl: false });
        },
        error: async (err) => {
          const toast = await this.toast.create({
            message: err?.error?.message ?? 'Não foi possível criar intervenção.',
            duration: 2000,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  coverPhotoSrc(vehicle: VehicleLookup): string {
    return vehicle.cover_photo?.url || vehicle.cover_photo?.thumb || '';
  }
}
