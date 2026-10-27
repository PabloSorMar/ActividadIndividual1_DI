import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { AuthState, LoginCredentials, RegisterDto, User, UserRole } from '../models/auth.models';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'novagestion_auth_session';

/**
 * Servicio centralizado de Autenticación y Control de Acceso por Roles (RA 1 y RA 2).
 * Gestiona el estado de sesión de forma reactiva y proporciona validaciones asíncronas contra servicio.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * Usuarios predefinidos en el sistema (simulación de base de datos)
   */
  private readonly defaultUsers: User[] = [
    {
      id: 'usr-admin-01',
      email: 'admin@empresa.com',
      name: 'Carlos Mendoza (Director)',
      role: 'admin',
      company: 'Nova Sistemas S.L.',
      dniCif: 'B87654321',
      phone: '+34 600 112 233',
      createdAt: '2026-01-10T08:00:00Z',
      lastLogin: new Date().toISOString()
    },
    {
      id: 'usr-std-02',
      email: 'user@empresa.com',
      name: 'Laura Gómez (Técnico)',
      role: 'user',
      company: 'Nova Sistemas S.L.',
      dniCif: '48991234F',
      phone: '+34 611 445 566',
      createdAt: '2026-02-15T09:30:00Z',
      lastLogin: new Date().toISOString()
    }
  ];

  private registeredUsers: User[] = [];

  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    token: null
  });

  public readonly state$ = this.authState$.asObservable();
  public readonly currentUser$ = this.authState$.pipe(map(s => s.currentUser));
  public readonly isAuthenticated$ = this.authState$.pipe(map(s => s.isAuthenticated));
  public readonly userRole$ = this.authState$.pipe(map(s => s.currentUser?.role ?? null));

  constructor() {
    this.initUsersDatabase();
    this.restoreSession();
  }

  private initUsersDatabase(): void {
    const saved = localStorage.getItem('novagestion_registered_users');
    if (saved) {
      try {
        this.registeredUsers = JSON.parse(saved);
      } catch {
        this.registeredUsers = [...this.defaultUsers];
      }
    } else {
      this.registeredUsers = [...this.defaultUsers];
      this.persistUsers();
    }
  }

  private persistUsers(): void {
    localStorage.setItem('novagestion_registered_users', JSON.stringify(this.registeredUsers));
  }

  private restoreSession(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw) as AuthState;
        if (session && session.isAuthenticated && session.currentUser) {
          this.authState$.next(session);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  /**
   * Obtiene el usuario activo sincrónicamente
   */
  public getCurrentUser(): User | null {
    return this.authState$.value.currentUser;
  }

  /**
   * Obtiene el rol activo sincrónicamente
   */
  public getUserRole(): UserRole | null {
    return this.authState$.value.currentUser?.role ?? null;
  }

  /**
   * Comprueba si el usuario tiene un rol específico
   */
  public hasRole(requiredRole: UserRole): boolean {
    return this.authState$.value.currentUser?.role === requiredRole;
  }

  /**
   * Comprueba si el usuario está autenticado
   */
  public isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  private supabaseService = inject(SupabaseService);

  /**
   * Proceso de autenticación con validación ESTRICTA en Supabase.
   * Solo los usuarios dados de alta en Supabase pueden acceder.
   */
  public login(credentials: LoginCredentials): Observable<{ success: boolean; message: string; user?: User }> {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    
    return from(this.supabaseService.loginWithSupabase(credentials.email, credentials.password)).pipe(
      map((sbRes) => {
        if (sbRes.success && sbRes.user) {
          const user: User = {
            id: sbRes.user.id,
            email: normalizedEmail,
            name: sbRes.user.name || (sbRes.role === 'admin' ? 'Administrador Supabase' : 'Usuario Supabase'),
            role: sbRes.role,
            company: 'Nova Sistemas S.L.',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };

          const token = `supabase-token.${btoa(JSON.stringify({ sub: user.id, role: user.role }))}`;
          const newState: AuthState = {
            isAuthenticated: true,
            currentUser: user,
            token
          };

          this.authState$.next(newState);
          sessionStorage.setItem('DAM2_AUTH_SESSION', JSON.stringify(newState));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

          return { success: true, message: 'Autenticación con Supabase exitosa', user };
        }

        // BLOQUEO: Solo usuarios que existan en Supabase pueden entrar
        return {
          success: false,
          message: sbRes.message || 'Solo los usuarios registrados en la base de datos de Supabase pueden iniciar sesión.'
        };
      })
    );
  }

  /**
   * Alta de nuevo usuario en Supabase Auth y actualización de la tabla en base de datos
   */
  public register(dto: RegisterDto): Observable<{ success: boolean; message: string; user?: User }> {
    return from(this.supabaseService.registerWithSupabase(dto)).pipe(
      map((res) => {
        if (res.success && res.user) {
          const newUser: User = {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            company: res.user.company,
            dniCif: res.user.dniCif,
            phone: res.user.phone,
            createdAt: res.user.createdAt,
            lastLogin: new Date().toISOString()
          };

          this.registeredUsers.push(newUser);
          this.persistUsers();

          // Autentica al nuevo usuario con credenciales Supabase
          const token = `supabase-jwt-token.${btoa(JSON.stringify({ sub: newUser.id, role: newUser.role }))}`;
          const newState: AuthState = {
            isAuthenticated: true,
            currentUser: newUser,
            token
          };
          this.authState$.next(newState);
          sessionStorage.setItem('DAM2_AUTH_SESSION', JSON.stringify(newState));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

          return { success: true, message: res.message, user: newUser };
        }

        return {
          success: false,
          message: res.message || 'Error al crear el usuario en la base de datos de Supabase.'
        };
      })
    );
  }

  /**
   * Validación asíncrona contra servicio: Comprueba si un correo ya existe (RA 2)
   * Simula consulta en tiempo real a base de datos con debounce y delay
   */
  public checkEmailAvailability(email: string): Observable<boolean> {
    const normalized = email.trim().toLowerCase();
    return of(null).pipe(
      delay(500), // Simula latencia de consulta a la base de datos
      map(() => {
        const exists = this.registeredUsers.some(u => u.email.toLowerCase() === normalized);
        return !exists; // true si está disponible, false si ya existe
      })
    );
  }

  /**
   * Validación asíncrona contra servicio: Comprueba si un DNI/CIF ya existe
   */
  public checkDniAvailability(dni: string): Observable<boolean> {
    const normalized = dni.trim().toUpperCase();
    return of(null).pipe(
      delay(450),
      map(() => {
        const exists = this.registeredUsers.some(u => u.dniCif?.toUpperCase() === normalized);
        return !exists;
      })
    );
  }

  /**
   * Cierre de sesión y limpieza de tokens
   */
  public logout(): void {
    sessionStorage.removeItem('DAM2_AUTH_SESSION');
    localStorage.removeItem(STORAGE_KEY);
    this.authState$.next({
      isAuthenticated: false,
      currentUser: null,
      token: null
    });
  }
}
