import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { finalize, firstValueFrom } from 'rxjs';
import {
  RepairChecklistItem,
  RepairDetail,
  RepairMedia,
  RepairPart,
  RepairState,
} from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

type RepairSection = 'overview' | 'checklist' | 'media' | 'parts' | 'history';

@Component({
  selector: 'app-repair-detail-page',
  templateUrl: './repair-detail.page.html',
  styleUrls: ['./repair-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonTextarea,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonSpinner,
    IonList,
    IonBadge,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonAccordionGroup,
    IonAccordion,
    IonCheckbox,
    IonProgressBar,
  ],
})
export class RepairDetailPage {
  @ViewChild('checkinCameraPicker') checkinCameraPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('checkinPicker') checkinPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('checkoutCameraPicker') checkoutCameraPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('checkoutPicker') checkoutPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryStrip') galleryStrip?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly toast = inject(ToastController);
  private readonly actionSheet = inject(ActionSheetController);

  loading = true;
  submitting = false;
  uploadingMedia = false;
  mediaUploadMessage = '';
  mediaUploadCollection: 'checkin' | 'checkout' | null = null;
  section: RepairSection = 'overview';
  repair: RepairDetail | null = null;
  states: RepairState[] = [];

  form = {
    name: '',
    kilometers: null as number | null,
    obs_1: '',
    obs_2: '',
    work_performed: '',
    materials_used: '',
    expected_completion_date: '',
    timestamp: '',
    repair_state_id: null as number | null,
  };

  checklistMap: Record<string, RepairChecklistItem> = {};
  checklistGroups: Array<{ name: string; items: RepairChecklistItem[] }> = [];

  partDraft = this.emptyPartDraft();
  editingPartId: number | null = null;

  isGalleryOpen = false;
  galleryTitle = 'Fotos';
  galleryPhotos: RepairMedia[] = [];
  galleryIndex = 0;

  ionViewWillEnter(): void {
    this.load();
    this.workshopApi.getRepairStates().subscribe({ next: (items) => (this.states = items) });
  }

  private repairId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  private emptyPartDraft() {
    return {
      supplier: '',
      invoice_number: '',
      part_date: '',
      part_name: '',
      amount: null as number | null,
    };
  }

  load(): void {
    this.loading = true;
    this.workshopApi
      .getRepair(this.repairId())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => this.applyUpdate(res.data),
        error: async () => this.presentToast('Erro ao carregar intervencao.', 'danger', 1800),
      });
  }

  applyUpdate(data: RepairDetail): void {
    this.repair = data;

    this.form.name = data.name ?? '';
    this.form.kilometers = data.kilometers ?? null;
    this.form.obs_1 = data.obs_1 ?? '';
    this.form.obs_2 = data.obs_2 ?? '';
    this.form.work_performed = data.work_performed ?? '';
    this.form.materials_used = data.materials_used ?? '';
    this.form.expected_completion_date = data.expected_completion_date ?? '';
    this.form.timestamp = this.toDatetimeLocal(data.timestamp);
    this.form.repair_state_id = data.repair_state_id;

    const groups: Record<string, RepairChecklistItem[]> = {};
    this.checklistMap = {};
    for (const item of data.checklist ?? []) {
      const cloned: RepairChecklistItem = { ...item };
      this.checklistMap[item.key] = cloned;
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(cloned);
    }
    this.checklistGroups = Object.keys(groups).map((name) => ({ name, items: groups[name] }));

    this.partDraft = this.emptyPartDraft();
    this.editingPartId = null;
  }

  get checklistProgress(): number {
    if (!this.repair) return 0;
    const total = Object.values(this.checklistMap).length;
    if (!total) return 0;
    const done = Object.values(this.checklistMap).filter((item) => item.checked).length;
    return done / total;
  }

  get checklistPercentLabel(): string {
    return `${Math.round(this.checklistProgress * 100)}%`;
  }

  async openMediaPicker(collection: 'checkin' | 'checkout'): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Adicionar foto',
      buttons: [
        {
          text: 'Tirar foto',
          role: 'selected',
          handler: () => this.triggerMediaPicker(collection, 'camera'),
        },
        {
          text: 'Escolher da galeria',
          handler: () => this.triggerMediaPicker(collection, 'gallery'),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });

    await sheet.present();
  }

  private triggerMediaPicker(collection: 'checkin' | 'checkout', source: 'camera' | 'gallery'): void {
    if (collection === 'checkin') {
      if (source === 'camera') {
        this.checkinCameraPicker?.nativeElement.click();
        return;
      }
      this.checkinPicker?.nativeElement.click();
      return;
    }

    if (source === 'camera') {
      this.checkoutCameraPicker?.nativeElement.click();
      return;
    }
    this.checkoutPicker?.nativeElement.click();
  }

  onSelectMedia(event: Event, collection: 'checkin' | 'checkout'): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) {
      return;
    }

    this.uploadingMedia = true;
    this.mediaUploadCollection = collection;
    this.mediaUploadMessage = files.length === 1 ? 'A preparar foto...' : `A preparar ${files.length} fotos...`;
    (async () => {
      try {
        let latest = this.repair;
        for (const [index, file] of files.entries()) {
          this.mediaUploadMessage = `A ajustar foto ${index + 1} de ${files.length}...`;
          const resizedFile = await this.resizeImageForUpload(file);

          this.mediaUploadMessage = `A enviar foto ${index + 1} de ${files.length}...`;
          const res = await firstValueFrom(this.workshopApi.uploadRepairMedia(this.repairId(), collection, resizedFile));
          latest = res.data;
        }
        if (latest) {
          this.applyUpdate(latest);
        }
        await this.presentToast(`${files.length} ficheiro(s) enviado(s).`, 'success', 1400);
      } catch {
        await this.presentToast('Falha ao enviar ficheiros.', 'danger', 1800);
      } finally {
        this.uploadingMedia = false;
        this.mediaUploadMessage = '';
        this.mediaUploadCollection = null;
        input.value = '';
      }
    })();
  }

  private async resizeImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    let image: HTMLImageElement;
    try {
      image = await this.loadImage(file);
    } catch {
      return file;
    }

    const maxWidth = 600;
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    });

    if (!blob) {
      return file;
    }

    const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${normalizedName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Nao foi possivel preparar a imagem.'));
      };

      image.src = url;
    });
  }


  openGallery(photos: RepairMedia[], index: number, title: string): void {
    this.galleryPhotos = photos;
    this.galleryIndex = index;
    this.galleryTitle = title;
    this.isGalleryOpen = true;

    setTimeout(() => this.scrollGalleryTo(index, false), 50);
  }

  closeGallery(): void {
    this.isGalleryOpen = false;
    this.galleryPhotos = [];
    this.galleryTitle = 'Fotos';
    this.galleryIndex = 0;
  }

  private scrollGalleryTo(index: number, smooth = true): void {
    const container = this.galleryStrip?.nativeElement;
    if (!container) return;

    const max = this.galleryPhotos.length - 1;
    const target = Math.max(0, Math.min(index, max));
    const width = container.clientWidth;

    container.scrollTo({
      left: width * target,
      behavior: smooth ? 'smooth' : 'auto',
    });

    this.galleryIndex = target;
  }
  removeMedia(mediaId: number): void {
    this.uploadingMedia = true;
    this.workshopApi
      .deleteRepairMedia(this.repairId(), mediaId)
      .pipe(finalize(() => (this.uploadingMedia = false)))
      .subscribe({
        next: (res) => this.applyUpdate(res.data),
        error: async () => this.presentToast('Falha ao remover imagem.', 'danger', 1800),
      });
  }

  saveAll(): void {
    if (!this.repair) return;

    const payload: Record<string, unknown> = {
      name: this.form.name || null,
      kilometers: this.form.kilometers ?? null,
      obs_1: this.form.obs_1 || null,
      obs_2: this.form.obs_2 || null,
      work_performed: this.form.work_performed || null,
      materials_used: this.form.materials_used || null,
      expected_completion_date: this.form.expected_completion_date || null,
      repair_state_id: this.form.repair_state_id,
      timestamp: this.form.timestamp ? this.fromDatetimeLocal(this.form.timestamp) : null,
    };

    Object.values(this.checklistMap).forEach((item) => {
      payload[item.key] = item.checked;
      payload[`${item.key}_text`] = (item.note ?? '').trim() || null;
    });

    this.submitting = true;
    this.workshopApi
      .updateRepair(this.repairId(), payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: async (res) => {
          this.applyUpdate(res.data);
          await this.presentToast('Intervencao atualizada com sucesso.', 'success', 1300);
        },
        error: async (err) => {
          await this.presentToast(err?.error?.message ?? 'Falha ao guardar.', 'danger', 1800);
        },
      });
  }

  runAction(action: 'startRepair' | 'finishRepair' | 'startMyWork' | 'finishMyWork'): void {
    this.submitting = true;
    this.workshopApi[action](this.repairId())
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: async (res) => {
          this.applyUpdate(res.data);
          await this.presentToast('Acao concluida.', 'success', 1200);
        },
        error: async (err) => {
          await this.presentToast(err?.error?.message ?? 'Acao nao concluida.', 'danger', 1800);
        },
      });
  }

  createNewIntervention(vehicleId: number): void {
    this.submitting = true;
    this.workshopApi
      .createIntervention(vehicleId)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: async (res) => {
          const newId = res?.data?.id;
          if (newId) {
            await this.router.navigateByUrl(`/workshop/repairs/${newId}`);
            return;
          }
          await this.presentToast('Intervencao criada.', 'success', 1200);
        },
        error: async (err) => {
          await this.presentToast(err?.error?.message ?? 'Nao foi possivel criar nova intervencao.', 'danger', 1800);
        },
      });
  }

  startEditPart(part: RepairPart): void {
    this.editingPartId = part.id;
    this.partDraft = {
      supplier: part.supplier ?? '',
      invoice_number: part.invoice_number ?? '',
      part_date: part.part_date ?? '',
      part_name: part.part_name ?? '',
      amount: part.amount ?? null,
    };
    this.section = 'parts';
  }

  cancelEditPart(): void {
    this.editingPartId = null;
    this.partDraft = this.emptyPartDraft();
  }

  savePart(): void {
    if (!this.partDraft.part_name || !this.partDraft.amount || this.partDraft.amount <= 0) {
      return;
    }

    const payload = {
      supplier: this.partDraft.supplier || undefined,
      invoice_number: this.partDraft.invoice_number || undefined,
      part_date: this.partDraft.part_date || undefined,
      part_name: this.partDraft.part_name,
      amount: Number(this.partDraft.amount),
    };

    this.submitting = true;

    const request$ = this.editingPartId
      ? this.workshopApi.updatePart(this.repairId(), this.editingPartId, payload)
      : this.workshopApi.addPart(this.repairId(), payload);

    request$
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: async (res) => {
          this.applyUpdate(res.data);
          await this.presentToast(this.editingPartId ? 'Peca atualizada.' : 'Peca adicionada.', 'success', 1200);
        },
        error: async () => this.presentToast('Nao foi possivel guardar a peca.', 'danger', 1800),
      });
  }

  deletePart(partId: number): void {
    this.submitting = true;
    this.workshopApi
      .deletePart(this.repairId(), partId)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (res) => this.applyUpdate(res.data),
        error: async () => this.presentToast('Nao foi possivel remover a peca.', 'danger', 1800),
      });
  }

  trackByChecklist = (_: number, item: RepairChecklistItem) => item.key;
  trackByPart = (_: number, item: RepairPart) => item.id;
  trackByMedia = (_: number, item: { id: number }) => item.id;
  trackByHistory = (_: number, item: { id: number }) => item.id;

  formatMinutes(minutes: number | null | undefined): string {
    if (!minutes || minutes <= 0) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} min`;
    if (!m) return `${h}h`;
    return `${h}h ${m}m`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const normalized = value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-PT');
  }

  private toDatetimeLocal(value: string | null): string {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
  }

  private fromDatetimeLocal(value: string): string {
    return value.replace('T', ' ') + ':00';
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning', duration = 1400): Promise<void> {
    const toast = await this.toast.create({ message, duration, color });
    await toast.present();
  }
}




