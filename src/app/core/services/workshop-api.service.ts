import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RepairDetail,
  RepairListItem,
  RepairState,
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
      part_date?: string;
      part_name: string;
      amount: number;
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
      part_date?: string;
      part_name?: string;
      amount?: number;
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

  searchVehicles(search = ''): Observable<{ data: VehicleLookup[] }> {
    return this.http.get<{ data: VehicleLookup[] }>(`${environment.apiBaseUrl}/mobile/workshop/vehicles`, {
      params: { search },
    });
  }

  createIntervention(vehicleId: number): Observable<{ data: RepairDetail }> {
    return this.http.post<{ data: RepairDetail }>(`${environment.apiBaseUrl}/mobile/workshop/vehicles/${vehicleId}/interventions`, {});
  }
}
