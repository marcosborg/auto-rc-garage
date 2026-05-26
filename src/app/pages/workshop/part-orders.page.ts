import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
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
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  ToastController,
} from '@ionic/angular/standalone';
import { finalize } from 'rxjs';
import { PartOrder, PartOrderSupplier, VehicleLookup } from '../../core/models/workshop.models';
import { WorkshopApiService } from '../../core/services/workshop-api.service';

@Component({
  selector: 'app-part-orders-page',
  templateUrl: './part-orders.page.html',
  styleUrls: ['./part-orders.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonList,
  ],
})
export class PartOrdersPage {
  private readonly workshopApi = inject(WorkshopApiService);
  private readonly toast = inject(ToastController);

  orders: PartOrder[] = [];
  suppliers: PartOrderSupplier[] = [];
  vehicles: VehicleLookup[] = [];
  search = '';
  vehicleSearch = '';
  loading = false;
  creating = false;
  creatingSupplier = false;
  showForm = false;
  showSupplierForm = false;

  form = {
    vehicle_id: null as number | null,
    suplier_id: null as number | null,
    priority: 'normal' as 'low' | 'normal' | 'urgent',
    requested_delivery_days: null as number | null,
    expected_delivery_date: '',
    notes: '',
    items: [
      {
        reference: '',
        description: '',
        quantity: 1,
        observations: '',
      },
    ],
  };

  supplierForm = {
    name: '',
    email: '',
    phone: '',
    mobile: '',
    nif: '',
    notes: '',
  };

  ionViewWillEnter(): void {
    this.load();
    this.loadSuppliers();
  }

  load(event?: CustomEvent): void {
    this.loading = !event;
    this.workshopApi
      .getPartOrders(this.search)
      .pipe(finalize(() => {
        this.loading = false;
        event?.detail.complete();
      }))
      .subscribe({
        next: (res) => (this.orders = res.data),
        error: () => this.showToast('Não foi possível carregar encomendas.', 'danger'),
      });
  }

  loadSuppliers(): void {
    this.workshopApi.getPartOrderSuppliers().subscribe({
      next: (res) => (this.suppliers = res.data),
    });
  }

  searchVehicles(): void {
    if (!this.vehicleSearch.trim()) {
      this.vehicles = [];
      this.form.vehicle_id = null;
      return;
    }

    this.workshopApi.searchVehicles(this.vehicleSearch).subscribe({
      next: (res) => (this.vehicles = res.data),
      error: () => this.showToast('Não foi possível pesquisar viaturas.', 'danger'),
    });
  }

  addItem(): void {
    this.form.items.push({ reference: '', description: '', quantity: 1, observations: '' });
  }

  removeItem(index: number): void {
    this.form.items.splice(index, 1);
    if (this.form.items.length === 0) {
      this.addItem();
    }
  }

  submitSupplier(): void {
    const name = this.supplierForm.name.trim();
    if (!name) {
      this.showToast('Indique o nome do fornecedor.', 'warning');
      return;
    }

    this.creatingSupplier = true;
    this.workshopApi
      .createPartOrderSupplier({
        name,
        email: this.supplierForm.email || null,
        phone: this.supplierForm.phone || null,
        mobile: this.supplierForm.mobile || null,
        nif: this.supplierForm.nif || null,
        notes: this.supplierForm.notes || null,
      })
      .pipe(finalize(() => (this.creatingSupplier = false)))
      .subscribe({
        next: async (res) => {
          this.suppliers = [...this.suppliers, res.data].sort((a, b) => a.name.localeCompare(b.name));
          this.form.suplier_id = res.data.id;
          this.resetSupplierForm();
          this.showSupplierForm = false;
          await this.showToast('Fornecedor criado.', 'success');
        },
        error: () => this.showToast('NÃ£o foi possÃ­vel criar o fornecedor.', 'danger'),
      });
  }

  submit(): void {
    const items = this.form.items
      .filter((item) => item.description.trim())
      .map((item) => ({
        reference: item.reference || null,
        description: item.description.trim(),
        quantity: Number(item.quantity || 1),
        observations: item.observations || null,
      }));

    if (!items.length) {
      this.showToast('Adicione pelo menos uma peça.', 'warning');
      return;
    }

    this.creating = true;
    this.workshopApi
      .createPartOrder({
        vehicle_id: this.form.vehicle_id,
        suplier_id: this.form.suplier_id,
        priority: this.form.priority,
        requested_delivery_days: this.form.requested_delivery_days,
        expected_delivery_date: this.form.expected_delivery_date || null,
        notes: this.form.notes || null,
        items,
      })
      .pipe(finalize(() => (this.creating = false)))
      .subscribe({
        next: async () => {
          await this.showToast('Pedido criado.', 'success');
          this.resetForm();
          this.showForm = false;
          this.load();
        },
        error: () => this.showToast('Não foi possível criar o pedido.', 'danger'),
      });
  }

  resetForm(): void {
    this.form = {
      vehicle_id: null,
      suplier_id: null,
      priority: 'normal',
      requested_delivery_days: null,
      expected_delivery_date: '',
      notes: '',
      items: [{ reference: '', description: '', quantity: 1, observations: '' }],
    };
    this.vehicleSearch = '';
    this.vehicles = [];
    this.resetSupplierForm();
    this.showSupplierForm = false;
  }

  resetSupplierForm(): void {
    this.supplierForm = {
      name: '',
      email: '',
      phone: '',
      mobile: '',
      nif: '',
      notes: '',
    };
  }

  badgeColor(order: PartOrder): string {
    if (order.received_badge === 'chegou') return 'success';
    if (order.received_badge === 'parcial') return 'warning';
    if (order.received_badge === 'atrasado') return 'danger';
    return 'medium';
  }

  priorityLabel(value: string): string {
    return ({ low: 'Baixa', normal: 'Normal', urgent: 'Urgente' } as Record<string, string>)[value] || value;
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    return new Date(value.replace(' ', 'T')).toLocaleDateString('pt-PT');
  }

  trackByOrder(_: number, order: PartOrder): number {
    return order.id;
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toast.create({ message, color, duration: 1800 });
    await toast.present();
  }
}
