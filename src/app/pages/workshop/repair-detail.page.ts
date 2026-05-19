import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
import jsPDF from 'jspdf';
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
type SignatureRole = 'receptionist' | 'client';

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
export class RepairDetailPage implements AfterViewChecked {
  @ViewChild('receptionistSignatureCanvas') receptionistSignatureCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('clientSignatureCanvas') clientSignatureCanvas?: ElementRef<HTMLCanvasElement>;
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
  savingSignatures = false;
  generatingEntryPdf = false;
  receptionistSignatureDataUrl = '';
  clientSignatureDataUrl = '';
  receptionistSignatureRemoved = false;
  clientSignatureRemoved = false;

  private drawingRole: SignatureRole | null = null;
  private signatureCanvasesReady = false;

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

  ngAfterViewChecked(): void {
    if (this.section !== 'overview' || this.signatureCanvasesReady) {
      return;
    }

    const canvases = [this.receptionistSignatureCanvas?.nativeElement, this.clientSignatureCanvas?.nativeElement];
    if (canvases.every(Boolean)) {
      canvases.forEach((canvas) => this.prepareSignatureCanvas(canvas as HTMLCanvasElement));
      this.signatureCanvasesReady = true;
    }
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
    this.receptionistSignatureDataUrl = '';
    this.clientSignatureDataUrl = '';
    this.receptionistSignatureRemoved = false;
    this.clientSignatureRemoved = false;
    this.signatureCanvasesReady = false;
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

  get canGenerateEntrySheetPdf(): boolean {
    return this.signaturesSavedForPdf && !this.generatingEntryPdf;
  }

  get signaturesSavedForPdf(): boolean {
    return !!this.repair?.receptionist_signature
      && !!this.repair?.client_signature
      && !this.receptionistSignatureDataUrl
      && !this.clientSignatureDataUrl
      && !this.receptionistSignatureRemoved
      && !this.clientSignatureRemoved;
  }

  hasSignature(role: SignatureRole): boolean {
    if (role === 'receptionist') {
      return !!this.receptionistSignatureDataUrl || (!!this.repair?.receptionist_signature && !this.receptionistSignatureRemoved);
    }

    return !!this.clientSignatureDataUrl || (!!this.repair?.client_signature && !this.clientSignatureRemoved);
  }

  signatureStatus(role: SignatureRole): string {
    return this.hasSignature(role) ? 'Assinado' : 'Pendente';
  }

  beginSignature(event: PointerEvent, role: SignatureRole): void {
    const canvas = this.signatureCanvas(role);
    if (!canvas) return;

    this.drawingRole = role;
    canvas.setPointerCapture(event.pointerId);

    const context = this.signatureContext(canvas);
    const point = this.canvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  drawSignature(event: PointerEvent, role: SignatureRole): void {
    if (this.drawingRole !== role) return;

    const canvas = this.signatureCanvas(role);
    if (!canvas) return;

    const context = this.signatureContext(canvas);
    const point = this.canvasPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    if (role === 'receptionist') {
      this.receptionistSignatureDataUrl = dataUrl;
      this.receptionistSignatureRemoved = false;
      return;
    }

    this.clientSignatureDataUrl = dataUrl;
    this.clientSignatureRemoved = false;
  }

  endSignature(event: PointerEvent, role: SignatureRole): void {
    if (this.drawingRole !== role) return;

    this.drawingRole = null;
    this.signatureCanvas(role)?.releasePointerCapture(event.pointerId);
  }

  clearSignature(role: SignatureRole): void {
    const canvas = this.signatureCanvas(role);
    if (canvas) {
      this.prepareSignatureCanvas(canvas);
    }

    if (role === 'receptionist') {
      this.receptionistSignatureDataUrl = '';
      this.receptionistSignatureRemoved = true;
      return;
    }

    this.clientSignatureDataUrl = '';
    this.clientSignatureRemoved = true;
  }

  saveSignatures(): void {
    if (!this.hasSignature('receptionist') || !this.hasSignature('client')) {
      this.presentToast('As duas assinaturas sao obrigatorias.', 'warning', 1800);
      return;
    }

    this.savingSignatures = true;
    (async () => {
      try {
        const receptionistFile = await this.signatureFile('receptionist', 'assinatura-rececao.png');
        const clientFile = await this.signatureFile('client', 'assinatura-cliente.png');
        const res = await firstValueFrom(this.workshopApi.saveRepairSignatures(this.repairId(), receptionistFile, clientFile));
        this.applyUpdate(res.data);
        await this.presentToast('Assinaturas guardadas.', 'success', 1400);
      } catch {
        await this.presentToast('Nao foi possivel guardar as assinaturas.', 'danger', 1800);
      } finally {
        this.savingSignatures = false;
      }
    })();
  }

  generateEntrySheetPdf(): void {
    if (!this.repair) return;
    if (!this.canGenerateEntrySheetPdf) {
      this.presentToast('Guarde as duas assinaturas antes de gerar o PDF.', 'warning', 1800);
      return;
    }

    this.generatingEntryPdf = true;
    (async () => {
      try {
        const pdf = await this.buildEntrySheetPdf(this.repair as RepairDetail);
        const fileName = `folha-entrada-${this.repairLabel(this.repair as RepairDetail)}-${Date.now()}.pdf`;

        if (Capacitor.isNativePlatform()) {
          const base64 = pdf.output('datauristring').split(',')[1];
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
          });

          await Share.share({
            title: 'Folha de entrada',
            text: 'Folha de entrada da intervencao',
            url: result.uri,
            dialogTitle: 'Abrir ou imprimir folha de entrada',
          });
        } else {
          window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
        }
      } catch {
        await this.presentToast('Nao foi possivel gerar o PDF.', 'danger', 1800);
      } finally {
        this.generatingEntryPdf = false;
      }
    })();
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

  private prepareSignatureCanvas(canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width || 320));
    const height = 150;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#172033';
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  private signatureCanvas(role: SignatureRole): HTMLCanvasElement | null {
    return role === 'receptionist'
      ? this.receptionistSignatureCanvas?.nativeElement ?? null
      : this.clientSignatureCanvas?.nativeElement ?? null;
  }

  private signatureContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas nao suportado.');
    }

    return context;
  }

  private canvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private async signatureFile(role: SignatureRole, fileName: string): Promise<File> {
    const localDataUrl = role === 'receptionist' ? this.receptionistSignatureDataUrl : this.clientSignatureDataUrl;
    if (localDataUrl) {
      return this.dataUrlToFile(localDataUrl, fileName);
    }

    const media = role === 'receptionist' ? this.repair?.receptionist_signature : this.repair?.client_signature;
    if (!media?.url) {
      throw new Error('Assinatura em falta.');
    }

    return this.urlToFile(media.url, fileName);
  }

  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, content] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new File([bytes], fileName, { type: mime, lastModified: Date.now() });
  }

  private async urlToFile(url: string, fileName: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Nao foi possivel obter assinatura existente.');
    }

    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || 'image/png', lastModified: Date.now() });
  }

  private async buildEntrySheetPdf(repair: RepairDetail): Promise<jsPDF> {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 12;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
    };

    const addLine = (label: string, value: string | number | null | undefined) => {
      ensureSpace(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(value ?? '-'), margin + 42, y);
      y += 6;
    };

    const addTextBlock = (label: string, value: string | null | undefined) => {
      ensureSpace(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(value?.trim() || '-', contentWidth);
      ensureSpace(lines.length * 5);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 3;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Auto RC - Folha de entrada', margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, margin, y);
    y += 8;

    pdf.setFontSize(11);
    addLine('Intervencao', `#${repair.id} - ${repair.repair_state}`);
    addLine('Viatura', `${repair.vehicle.license || repair.vehicle.foreign_license || '-'} - ${repair.vehicle.brand || ''} ${repair.vehicle.model || ''}`);
    addLine('Versao', repair.vehicle.version);
    addLine('Ano/Mes', `${repair.vehicle.year ?? '-'}/${repair.vehicle.month ?? '-'}`);
    addLine('Combustivel', repair.vehicle.fuel);
    addLine('Cor', repair.vehicle.color);
    addLine('Kms entrada', repair.kilometers ?? repair.vehicle.kilometers);
    addLine('Data/hora', repair.timestamp ? this.formatDateTime(repair.timestamp) : '-');
    addTextBlock('Observacoes de entrada', repair.obs_1);
    addTextBlock('Observacoes', repair.obs_2);

    ensureSpace(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Checklist', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    for (const item of repair.checklist) {
      const marker = item.checked ? '[x]' : '[ ]';
      const note = item.note ? ` - ${item.note}` : '';
      const lines = pdf.splitTextToSize(`${marker} ${item.group} - ${item.label}${note}`, contentWidth);
      ensureSpace(lines.length * 5);
      pdf.text(lines, margin, y);
      y += lines.length * 5;
    }

    ensureSpace(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fotos check-in', margin, y);
    y += 6;
    const photoWidth = (contentWidth - 6) / 2;
    const photoHeight = 38;
    for (const [index, photo] of repair.checkin_photos.entries()) {
      const column = index % 2;
      if (column === 0) {
        ensureSpace(photoHeight + 8);
      }
      const x = margin + column * (photoWidth + 6);
      const dataUrl = await this.urlToDataUrl(photo.url || photo.thumb);
      pdf.setDrawColor(210, 216, 226);
      pdf.rect(x, y, photoWidth, photoHeight);
      if (dataUrl) {
        pdf.addImage(dataUrl, this.imageFormat(dataUrl), x + 1, y + 1, photoWidth - 2, photoHeight - 2, undefined, 'FAST');
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.text('Foto indisponivel no momento da geracao', x + 3, y + 18, { maxWidth: photoWidth - 6 });
      }
      if (column === 1 || index === repair.checkin_photos.length - 1) {
        y += photoHeight + 6;
      }
    }
    if (!repair.checkin_photos.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.text('Sem fotos check-in.', margin, y);
      y += 6;
    }

    const receptionistSignature = await this.signatureDataUrlForPdf('receptionist');
    const clientSignature = await this.signatureDataUrlForPdf('client');
    ensureSpace(54);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Assinaturas', margin, y);
    y += 7;
    this.addSignatureToPdf(pdf, 'Rececao', receptionistSignature, margin, y, photoWidth, 32);
    this.addSignatureToPdf(pdf, 'Cliente', clientSignature, margin + photoWidth + 6, y, photoWidth, 32);

    return pdf;
  }

  private addSignatureToPdf(
    pdf: jsPDF,
    label: string,
    dataUrl: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x, y);
    pdf.rect(x, y + 3, width, height);
    if (dataUrl) {
      pdf.addImage(dataUrl, 'PNG', x + 2, y + 5, width - 4, height - 4, undefined, 'FAST');
    }
  }

  private async signatureDataUrlForPdf(role: SignatureRole): Promise<string | null> {
    const localDataUrl = role === 'receptionist' ? this.receptionistSignatureDataUrl : this.clientSignatureDataUrl;
    if (localDataUrl) {
      return localDataUrl;
    }

    const media = role === 'receptionist' ? this.repair?.receptionist_signature : this.repair?.client_signature;
    return media?.url ? this.urlToDataUrl(media.url) : null;
  }

  private async urlToDataUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private imageFormat(dataUrl: string): 'JPEG' | 'PNG' | 'WEBP' {
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'JPEG';
  }

  private repairLabel(repair: RepairDetail): string {
    return (repair.vehicle.license || repair.vehicle.foreign_license || String(repair.id))
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
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




