/**
 * Modelos de datos para el sistema de autenticación y control de acceso por roles.
 * Cumple con los requisitos del RA 1 y RA 2 (Módulo de Desarrollo de Interfaces).
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: string;
  dniCif?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  dniCif: string;
  password: string;
  role: UserRole;
  companyName: string;
  phone?: string;
  acceptTerms: boolean;
}
