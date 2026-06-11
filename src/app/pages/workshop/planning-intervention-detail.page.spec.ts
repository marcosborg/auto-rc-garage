import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { MobileUser, PlanningIntervention } from '../../core/models/workshop.models';
import { AuthService } from '../../core/services/auth.service';
import { PlanningSyncService } from '../../core/services/planning-sync.service';
import { PlanningInterventionDetailPage } from './planning-intervention-detail.page';

describe('PlanningInterventionDetailPage', () => {
  let fixture: ComponentFixture<PlanningInterventionDetailPage>;
  let component: PlanningInterventionDetailPage;
  let httpMock: HttpTestingController;
  let toastCreateSpy: jasmine.Spy;
  let alertCreateSpy: jasmine.Spy;
  const baseUrl = `${environment.apiBaseUrl}/mobile/workshop/planning`;

  beforeEach(async () => {
    toastCreateSpy = jasmine.createSpy('create').and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() });
    alertCreateSpy = jasmine.createSpy('create').and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() });

    await TestBed.configureTestingModule({
      imports: [PlanningInterventionDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '10' }),
            },
          },
        },
        { provide: ToastController, useValue: { create: toastCreateSpy } },
        { provide: AlertController, useValue: { create: alertCreateSpy } },
        {
          provide: AuthService,
          useValue: {
            user: signal<MobileUser | null>({
              id: 7,
              name: 'Marco',
              email: 'marco@example.test',
              roles: [],
              permissions: [],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningInterventionDetailPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    component.ngOnDestroy();
    httpMock.verify();
  });

  it('loads and renders intervention detail', () => {
    component.load();
    httpMock.expectOne(`${baseUrl}/interventions/10`).flush({ data: planningIntervention() });
    fixture.detectChanges();

    expect(component.intervention?.title).toBe('Diagnóstico');
    expect(fixture.nativeElement.textContent).toContain('AA-11-BB');
    expect(fixture.nativeElement.textContent).toContain('Diagnóstico');
  });

  it('starts the mechanic timer and emits the updated intervention', () => {
    const sync = TestBed.inject(PlanningSyncService);
    const syncSpy = spyOn(sync, 'notifyInterventionUpdated');
    component.intervention = planningIntervention();

    component.startWork();
    const req = httpMock.expectOne(`${baseUrl}/interventions/10/start`);
    expect(req.request.method).toBe('POST');
    const updated = planningIntervention({ status: 'in_progress', status_label: 'Em curso', my_work_in_progress: true });
    req.flush({ data: updated });

    expect(component.intervention).toEqual(updated);
    expect(syncSpy).toHaveBeenCalledWith(updated);
  });

  it('finishes the mechanic timer and emits the updated intervention', () => {
    const sync = TestBed.inject(PlanningSyncService);
    spyOn(sync, 'notifyInterventionUpdated');
    component.intervention = planningIntervention({ status: 'in_progress', my_work_in_progress: true });

    component.finishWork();
    const req = httpMock.expectOne(`${baseUrl}/interventions/10/finish`);
    expect(req.request.method).toBe('POST');
    const updated = planningIntervention({ status: 'in_progress', my_work_in_progress: false });
    req.flush({ data: updated });

    expect(component.intervention).toEqual(updated);
    expect(sync.notifyInterventionUpdated).toHaveBeenCalledWith(updated);
  });

  it('shows the 422 validation message when another job is already running', () => {
    component.intervention = planningIntervention();

    component.startWork();
    httpMock.expectOne(`${baseUrl}/interventions/10/start`).flush(
      {
        message: 'Já existe outro trabalho em curso.',
        errors: { intervention: ['Termine o trabalho atual antes de iniciar outro.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.actionError).toContain('Já existe outro trabalho em curso.');
    expect(component.actionError).toContain('Termine o trabalho atual antes de iniciar outro.');
  });

  it('confirms before completing the intervention for the whole team', async () => {
    component.intervention = planningIntervention({ status: 'in_progress' });

    await component.confirmComplete();

    expect(alertCreateSpy).toHaveBeenCalled();
    const options = alertCreateSpy.calls.mostRecent().args[0];
    options.buttons[1].handler();

    const req = httpMock.expectOne(`${baseUrl}/interventions/10/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: planningIntervention({ status: 'completed', status_label: 'Concluído', completed_at: '2026-06-11 12:00:00' }) });
  });

  it('does not show start action for completed or cancelled interventions', () => {
    component.loading = false;
    component.intervention = planningIntervention({ status: 'completed', status_label: 'Concluído' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Iniciar trabalho');

    component.intervention = planningIntervention({ status: 'cancelled', status_label: 'Cancelado' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Iniciar trabalho');
  });

  it('shows clear messages for network, 401 and 403 errors', () => {
    component.load();
    httpMock.expectOne(`${baseUrl}/interventions/10`).error(new ProgressEvent('error'));

    component.load();
    httpMock.expectOne(`${baseUrl}/interventions/10`).flush({}, { status: 401, statusText: 'Unauthorized' });

    component.load();
    httpMock.expectOne(`${baseUrl}/interventions/10`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(toastCreateSpy.calls.allArgs().map((args) => args[0].message)).toEqual([
      'Não foi possível carregar o trabalho.',
      'Sessão expirada. Inicie sessão novamente.',
      'Não tem permissão para executar este trabalho.',
    ]);
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
    planned_end_date: '2026-06-12',
    status: 'planned',
    status_label: 'Planeado',
    mechanics: [{ id: 7, name: 'Marco' }],
    work_logs: [
      {
        id: 100,
        user_id: 7,
        user_name: 'Marco',
        started_at: '2026-06-11 09:00:00',
        finished_at: '2026-06-11 10:00:00',
        duration_minutes: 60,
      },
    ],
    my_work_in_progress: false,
    completed_at: null,
    ...overrides,
  };
}
