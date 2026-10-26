import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/**
 * Tabla de Enrutamiento Global de la Aplicación (RA 1 - Paso 1.1).
 * Implementa Lazy Loading sistemático mediante loadComponent y protección estricta
 * de rutas basada en roles ('admin' y 'user') mediante Guards funcionales.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    title: 'Iniciar Sesión | NovaGestión'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
    title: 'Nuevo Registro | NovaGestión'
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage),
    canActivate: [authGuard],
    data: { role: 'admin' },
    title: 'Cuadro de Mando Admin | NovaGestión'
  },
  {
    path: 'management',
    loadComponent: () => import('./pages/management/management.page').then(m => m.ManagementPage),
    canActivate: [authGuard],
    data: { role: 'admin' },
    title: 'Gestión de Entidades | NovaGestión'
  },
  {
    path: 'user-dashboard',
    loadComponent: () => import('./pages/user-dashboard/user-dashboard.page').then(m => m.UserDashboardPage),
    canActivate: [authGuard],
    data: { role: 'user' },
    title: 'Portal de Usuario | NovaGestión'
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.page').then(m => m.UnauthorizedPage),
    title: 'Acceso Restringido | NovaGestión'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
