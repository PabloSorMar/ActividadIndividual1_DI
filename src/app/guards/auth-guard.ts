import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  // Indicamos explícitamente el tipo AuthService para evitar el error de tipo 'unknown'
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const expectedRole = route.data['role'];
    const currentRole = authService.getUserRole();

    if (!expectedRole || currentRole === expectedRole) {
      return true;
    }
  }

  router.navigate(['/login']);
  return false;
};