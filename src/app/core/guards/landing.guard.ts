import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MobileUser } from '../models/workshop.models';
import { TokenStorageService } from '../services/token-storage.service';

export const landingGuard: CanActivateFn = () => {
  const storage = inject(TokenStorageService);
  const router = inject(Router);
  if (!storage.getToken()) {
    return router.parseUrl('/login');
  }
  const user = storage.getUser<MobileUser>();
  return router.parseUrl(
    user?.permissions?.includes('painting_job_access') && !user.permissions.includes('repair_access')
      ? '/workshop/painting'
      : '/workshop/repairs',
  );
};
