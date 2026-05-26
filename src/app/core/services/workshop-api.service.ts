import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GarageVehicle,
  PaginatedResponse,
  PartOrder,
  PartOrderSupplier,
  RepairDetail,
  RepairListItem,
  RepairState,
  RepairWorkType,
  VehicleLookup,
} from '../models/workshop.models';

@Injectable({ providedIn: 'root' })
export class WorkshopApiService {
  constructor(private readonly http: HttpClient) {}

  getRepairStates(): Observable<RepairState[]> {
    return this.http.get<RepairState[]>(`${environment.apiBaseUrl}/mobile/workshop/repair-states`);
  }

  getRepairs(status: 'open' | 'all', search = ''): Observable<{ data: RepairListItem[] }> {
    return this.http.get<{ data: RepairListItem[] }>(`${environment.apiBaseUrl}/mobile/workshop/repairs`, {
      params: {
        status,
        search,
      },
    });
  }

  getGarageVehicles(search = '', page = 1, perPage = 10): Observable<PaginatedResponse<GarageVehicle>> {
    return this.http.get<PaginatedResponse<GarageVehicle>>(`${environment.apiBaseUrl}/mobile/workshop/garage-vehicles`, {
      params: {
        search,
        page,
        per_page: perPage,
      },
    });
  }

  getRepair(id: number): Observable<{ data: RepairDetail }> {
    return this.http.get<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}`);
  }

  updateRepair(id: number, payload: Record<string, unknown>): Observable<{ data: RepairDetail }> {
    return this.http.put<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}`, payload);
  }

  startRepair(id: number): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/start`, {});
  }

  finishRepair(id: number): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/finish`, {});
  }

  startMyWork(id: number): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/work/start`, {});
  }

  finishMyWork(id: number): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/work/finish`, {});
  }

  addPart(
    id: number,
    payload: {
      supplier?: string;
      invoice_number?: string;
      part_date: string;
      part_name: string;
      amount?: number | null;
    },
  ): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/parts`, payload);
  }

  updatePart(
    id: number,
    partId: number,
    payload: {
      supplier?: string;
      invoice_number?: string;
      part_date: string;
      part_name: string;
      amount?: number | null;
    },
  ): Observable<{ data: RepairDetail }> {
    return this.http.patch<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/parts/${partId}`, payload);
  }

  deletePart(id: number, partId: number): Observable<{ data: RepairDetail }> {
    return this.http.delete<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/parts/${partId}`);
  }

  uploadRepairMedia(id: number, collection: 'checkin' | 'checkout', file: File): Observable<{ data: RepairDetail }> {
    const formData = new FormData();
    formData.append('collection', collection);
    formData.append('file', file);
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/media`, formData);
  }

  deleteRepairMedia(id: number, mediaId: number): Observable<{ data: RepairDetail }> {
    return this.http.delete<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/media/${mediaId}`);
  }

  saveRepairSignatures(id: number, receptionistSignature: File, clientSignature: File): Observable<{ data: RepairDetail }> {
    const formData = new FormData();
    formData.append('receptionist_signature', receptionistSignature);
    formData.append('client_signature', clientSignature);
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/repairs/${id}/signatures`, formData);
  }

  searchVehicles(search = ''): Observable<{ data: VehicleLookup[] }> {
    return this.http.get<{ data: VehicleLookup[] }>(`${environment.apiBaseUrl}/mobile/workshop/vehicles`, {
      params: { search },
    });
  }

  createIntervention(vehicleId: number, workType: RepairWorkType = 'workshop'): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/vehicles/${vehicleId}/interventions`, {
      work_type: workType,
    });
  }

  getPartOrders(search = '', status = '', page = 1, perPage = 20): Observable<PaginatedResponse<PartOrder>> {
    return this.http.get<PaginatedResponse<PartOrder>>(`${environment.apiBaseUrl}/mobile/workshop/part-orders`, {
      params: {
        search,
        status,
        page,
        per_page: perPage,
      },
    });
  }

  createPartOrder(payload: {
    vehicle_id?: number | null;
    repair_id?: number | null;
    suplier_id?: number | null;
    priority?: 'low' | 'normal' | 'urgent';
    requested_delivery_days?: number | null;
    expected_delivery_date?: string | null;
    notes?: string | null;
    items: Array<{
      reference?: string | null;
      description: string;
      quantity?: number | null;
      observations?: string | null;
    }>;
  }): Observable<{ data: PartOrder }> {
    return this.http.post<{ data: PartOrder }>(`${environment.apiBaseUrl}/mobile/workshop/part-orders`, payload);
  }

  getPartOrderSuppliers(): Observable<{ data: PartOrderSupplier[] }> {
    return this.http.get<{ data: PartOrderSupplier[] }>(`${environment.apiBaseUrl}/mobile/workshop/part-order-suppliers`);
  }

  createPartOrderSupplier(payload: {
    name: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    nif?: string | null;
    notes?: string | null;
  }): Observable<{ data: PartOrderSupplier }> {
    return this.http.post<{ data: PartOrderSupplier }>(`${environment.apiBaseUrl}/mobile/workshop/part-order-suppliers`, payload);
  }
}
