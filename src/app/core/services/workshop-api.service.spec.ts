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
});
