import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { PlanningIntervention } from '../../core/models/workshop.models';
import { PlanningSyncService } from '../../core/services/planning-sync.service';
import { PlanningAgendaPage } from './planning-agenda.page';

describe('PlanningAgendaPage', () => {
  let fixture: ComponentFixture<PlanningAgendaPage>;
  let component: PlanningAgendaPage;
  let httpMock: HttpTestingController;
  let toastCreateSpy: jasmine.Spy;
  const baseUrl = `${environment.apiBaseUrl}/mobile/workshop/planning`;

  beforeEach(async () => {
    toastCreateSpy = jasmine.createSpy('create').and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() });

    await TestBed.configureTestingModule({
      imports: [PlanningAgendaPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastController, useValue: { create: toastCreateSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAgendaPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    component.anchorDate = new Date(2026, 5, 11);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the daily agenda for the selected day', () => {
    component.load();

    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`);
    expect(req.request.params.get('start_date')).toBe('2026-06-11');
    expect(req.request.params.get('end_date')).toBe('2026-06-11');
    req.flush({ data: [planningIntervention()] });

    expect(component.interventions.length).toBe(1);
  });

  it('loads the weekly agenda from Monday to Sunday', () => {
    component.onModeChange('week');

    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`);
    expect(req.request.params.get('start_date')).toBe('2026-06-08');
    expect(req.request.params.get('end_date')).toBe('2026-06-14');
    req.flush({ data: [] });
  });

  it('sends status when filtering by state', () => {
    component.onStatusChange('completed');

    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`);
    expect(req.request.params.get('status')).toBe('completed');
    req.flush({ data: [] });
  });

  it('shows an empty state when there are no interventions', () => {
    fixture.detectChanges();
    component.load();
    httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`).flush({ data: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sem trabalhos planeados para este período.');
  });

  it('shows the mechanics currently working on an intervention', () => {
    component.interventions = [planningIntervention({ active_mechanics: [{ id: 7, name: 'Marco' }] })];
    component.loading = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Em intervenção:');
    expect(fixture.nativeElement.textContent).toContain('Marco');
  });

  it('patches a loaded intervention when detail emits an update', () => {
    const sync = TestBed.inject(PlanningSyncService);
    component.interventions = [planningIntervention({ id: 10, title: 'Diagnóstico' })];

    sync.notifyInterventionUpdated(planningIntervention({ id: 10, title: 'Montagem' }));

    expect(component.interventions[0].title).toBe('Montagem');
  });

  it('shows clear messages for 401, 403 and network errors', () => {
    component.load();
    httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`).flush({}, { status: 401, statusText: 'Unauthorized' });

    component.load();
    httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`).flush({}, { status: 403, statusText: 'Forbidden' });

    component.load();
    httpMock.expectOne((request) => request.url === `${baseUrl}/my-agenda`).error(new ProgressEvent('error'));

    expect(toastCreateSpy.calls.allArgs().map((args) => args[0].message)).toEqual([
      'Sessão expirada. Inicie sessão novamente.',
      'Não tem permissão para consultar esta planificação.',
      'Não foi possível carregar a planificação.',
    ]);
  });

  it('navigates to the intervention detail', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    const intervention = planningIntervention({ id: 55 });

    component.openIntervention(intervention);

    expect(router.navigate).toHaveBeenCalledWith(['/workshop/planning', 55]);
  });
});

function planningIntervention(overrides: Partial<PlanningIntervention> = {}): PlanningIntervention {
  return {
    id: 10,
    repair_id: 5,
    vehicle: { id: 1, license: 'AA-11-BB' },
    type: { id: 2, name: 'Mecânica' },
    title: 'Diagnóstico',
    description: 'Verificar ruído',
    planned_start_date: '2026-06-11',
    planned_end_date: '2026-06-11',
    status: 'planned',
    status_label: 'Planeado',
    mechanics: [{ id: 7, name: 'Marco' }],
    active_mechanics: [],
    work_logs: [],
    my_work_in_progress: false,
    completed_at: null,
    ...overrides,
  };
}
