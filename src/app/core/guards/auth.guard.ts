import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';

/**
 * Guard funcional de Angular para protección de rutas según rol (RA 1).
 * Verifica autenticación activa y pertenencia al rol exigido ('admin' o 'user').
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Comprobar si el usuario está autenticado
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Comprobar si la ruta exige un rol específico
  const requiredRole = route.data['role'] as UserRole | undefined;
  if (requiredRole) {
    const currentRole = authService.getUserRole();

    // El Administrador tiene acceso total
    if (currentRole === 'admin') {
      return true;
    }

    // Si el rol no coincide con el exigido
    if (currentRole !== requiredRole) {
      router.navigate(['/unauthorized'], {
        queryParams: { requiredRole, currentRole }
      });
      return false;
    }
  }

  return true;
};
