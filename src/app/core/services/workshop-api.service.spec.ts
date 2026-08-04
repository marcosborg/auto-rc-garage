import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { WorkshopApiService } from './workshop-api.service';

describe('WorkshopApiService planning', () => {
  let service: WorkshopApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/mobile/workshop/planning`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkshopApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(WorkshopApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads my planning agenda with date range and optional status', () => {
    service
      .getMyPlanningAgenda({
        start_date: '2026-06-11',
        end_date: '2026-06-17',
        status: 'in_progress',
      })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('start_date')).toBe('2026-06-11');
    expect(req.request.params.get('end_date')).toBe('2026-06-17');
    expect(req.request.params.get('status')).toBe('in_progress');
    req.flush({ data: [] });
  });

  it('omits empty status from my planning agenda', () => {
    service
      .getMyPlanningAgenda({
        start_date: '2026-06-11',
        end_date: '2026-06-11',
        status: '',
      })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`);
    expect(req.request.params.has('status')).toBeFalse();
    req.flush({ data: [] });
  });

  it('calls planning action endpoints', () => {
    service.startPlanningIntervention(10).subscribe();
    const startReq = httpMock.expectOne(`${baseUrl}/interventions/10/start`);
    expect(startReq.request.method).toBe('POST');
    startReq.flush({ data: {} });

    service.finishPlanningIntervention(10).subscribe();
    const finishReq = httpMock.expectOne(`${baseUrl}/interventions/10/finish`);
    expect(finishReq.request.method).toBe('POST');
    finishReq.flush({ data: {} });

    service.completePlanningIntervention(10).subscribe();
    const completeReq = httpMock.expectOne(`${baseUrl}/interventions/10/complete`);
    expect(completeReq.request.method).toBe('POST');
    completeReq.flush({ data: {} });
  });

  it('loads painting jobs with the selected status', () => {
    service.getPaintingJobs('open').subscribe();
    const req = httpMock.expectOne((request) => request.url.endsWith('/mobile/workshop/painting-jobs'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('open');
    req.flush({ data: [] });
  });

  it('updates and completes a painting job with the form payload', () => {
    const payload = { damages: [{ zone: 'hood', intensity: 'light' as const }], materials: [], optics: null, black_parts: null, wheels: null, other_work: null, notes: null };
    const paintingUrl = `${environment.apiBaseUrl}/mobile/workshop/painting-jobs/7`;

    service.updatePaintingJob(7, payload).subscribe();
    const updateReq = httpMock.expectOne(paintingUrl);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual(payload);
    updateReq.flush({ data: {} });

    service.completePaintingJob(7, payload).subscribe();
    const completeReq = httpMock.expectOne(`${paintingUrl}/complete`);
    expect(completeReq.request.method).toBe('POST');
    expect(completeReq.request.body).toEqual(payload);
    completeReq.flush({ data: {} });
  });
});
