import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonSpinner, IonTextarea, ToastController } from '@ionic/angular/standalone';
import { finalize, firstValueFrom } from 'rxjs';
import { PaintingDamage, PaintingIntensity, PaintingJob, PaintingJobPayload, PaintingMaterial } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-painting-job-detail-page', templateUrl: './painting-job-detail.page.html', styleUrls: ['./painting-job-detail.page.scss'], standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption, IonButton, IonBadge, IonSpinner, IonList],
})
export class PaintingJobDetailPage {
  private readonly api = inject(WorkshopApiService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly toast = inject(ToastController); private readonly alert = inject(AlertController);
  job: PaintingJob | null = null; loading = false; saving = false;
  readonly intensityOrder: Array<PaintingIntensity | null> = [null, 'light', 'medium', 'heavy'];

  ionViewWillEnter(): void { this.load(); }
  load(): void { this.loading = true; this.api.getPaintingJob(Number(this.route.snapshot.paramMap.get('id'))).pipe(finalize(() => this.loading = false)).subscribe({ next: res => this.job = res.data, error: () => this.router.navigateByUrl('/workshop/painting') }); }
  get editable(): boolean { return this.job?.status === 'open'; }
  intensityLabel(value: PaintingIntensity | null): string { return value ? (this.job?.intensity_options[value] ?? value) : 'Sem dano'; }
  intensityClass(damage: PaintingDamage): string { return damage.intensity ? `level-${damage.intensity}` : 'level-none'; }
  cycleDamage(damage: PaintingDamage): void { if (!this.editable) return; const index = this.intensityOrder.indexOf(damage.intensity); damage.intensity = this.intensityOrder[(index + 1) % this.intensityOrder.length]; }
  addMaterial(): void { this.job?.materials.push({ material_type: '', reference: null, quantity: null, used_date: null, hours: null }); }
  removeMaterial(index: number): void { this.job?.materials.splice(index, 1); }
  payload(): PaintingJobPayload { const job = this.job!; return { damages: job.damages.map(({zone,intensity}) => ({zone,intensity})), materials: job.materials, optics: job.optics, black_parts: job.black_parts, wheels: job.wheels, other_work: job.other_work, notes: job.notes }; }
  async save(showToast = true): Promise<boolean> { if (!this.job || !this.editable || this.saving) return false; if (this.job.materials.some(item => !item.material_type.trim())) { await this.presentToast('Indique o nome de todos os materiais.', 'warning'); return false; } this.saving = true; try { const res = await firstValueFrom(this.api.updatePaintingJob(this.job.id, this.payload())); this.job = res.data; if (showToast) await this.presentToast('Ficha guardada.', 'success'); return true; } catch (error: any) { await this.presentToast(error?.error?.message ?? 'Não foi possível guardar.', 'danger'); return false; } finally { this.saving = false; } }
  async complete(): Promise<void> { if (!this.job || !this.editable) return; const confirm = await this.alert.create({ header:'Concluir ficha?', message:'Depois de concluída, a ficha deixa de poder ser editada na app.', buttons:[{text:'Cancelar',role:'cancel'},{text:'Concluir',handler:()=>this.doComplete()}] }); await confirm.present(); }
  private async doComplete(): Promise<void> { if (!this.job) return; if (this.job.materials.some(item => !item.material_type.trim())) { await this.presentToast('Indique o nome de todos os materiais.', 'warning'); return; } this.saving = true; try { const res = await firstValueFrom(this.api.completePaintingJob(this.job.id, this.payload())); this.job = res.data; await this.presentToast('Ficha concluída.', 'success'); } catch (error: any) { await this.presentToast(error?.error?.message ?? 'Não foi possível concluir.', 'danger'); } finally { this.saving = false; } }
  private async presentToast(message:string,color:string):Promise<void>{const toast=await this.toast.create({message,color,duration:1800});await toast.present();}
}
