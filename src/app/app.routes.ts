import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage),
    canActivate: [authGuard],
    data: { role: 'admin' }
  },
  {
    path: 'user-dashboard',
    loadComponent: () => import('./pages/user-dashboard/user-dashboard.page').then(m => m.UserDashboardPage),
    canActivate: [authGuard],
    data: { role: 'user' }
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then( m => m.AdminDashboardPage)
  }
];