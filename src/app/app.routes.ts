import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { landingGuard } from './core/guards/landing.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'workshop',
    loadComponent: () => import('./pages/workshop/workshop-shell.page').then((m) => m.WorkshopShellPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'painting',
        loadComponent: () => import('./pages/workshop/painting-jobs.page').then((m) => m.PaintingJobsPage),
      },
      {
        path: 'painting/:id',
        loadComponent: () => import('./pages/workshop/painting-job-detail.page').then((m) => m.PaintingJobDetailPage),
      },
      {
        path: 'repairs',
        loadComponent: () => import('./pages/workshop/repairs.page').then((m) => m.RepairsPage),
      },
      {
        path: 'repairs/:id',
        loadComponent: () => import('./pages/workshop/repair-detail.page').then((m) => m.RepairDetailPage),
      },
      {
        path: 'planning',
        loadComponent: () => import('./pages/workshop/planning-agenda.page').then((m) => m.PlanningAgendaPage),
      },
      {
        path: 'planning/:id',
        loadComponent: () => import('./pages/workshop/planning-intervention-detail.page').then((m) => m.PlanningInterventionDetailPage),
      },
      {
        path: 'new-intervention',
        loadComponent: () => import('./pages/workshop/new-intervention.page').then((m) => m.NewInterventionPage),
      },
      {
        path: 'garage-vehicles',
        loadComponent: () => import('./pages/workshop/garage-vehicles.page').then((m) => m.GarageVehiclesPage),
      },
      {
        path: 'part-orders',
        loadComponent: () => import('./pages/workshop/part-orders.page').then((m) => m.PartOrdersPage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'repairs',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '**',
    canActivate: [landingGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
];
