import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

export const guestGuard: CanActivateFn = () => {
  const storage = inject(TokenStorageService);
  const router = inject(Router);

  if (storage.getToken()) {
    return router.parseUrl('/workshop/repairs');
  }

  return true;
};

