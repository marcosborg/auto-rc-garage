import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';
import { MobileUser } from '../models/workshop.models';

export const guestGuard: CanActivateFn = () => {
  const storage = inject(TokenStorageService);
  const router = inject(Router);

  if (storage.getToken()) {
    const user = storage.getUser<MobileUser>();
    const destination = user?.permissions?.includes('painting_job_access') && !user?.permissions?.includes('repair_access')
      ? '/workshop/painting'
      : '/workshop/repairs';
    return router.parseUrl(destination);
  }

  return true;
};
