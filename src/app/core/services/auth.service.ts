import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { AuthState, LoginCredentials, RegisterDto, User, UserRole } from '../models/auth.models';

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
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
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

  /**
   * Proceso de autenticación con simulación asíncrona de token JWT (RA 1)
   */
  public login(credentials: LoginCredentials): Observable<{ success: boolean; message: string; user?: User }> {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    
    return of(null).pipe(
      delay(600), // Simula latencia de red
      map(() => {
        const user = this.registeredUsers.find(
          u => u.email.toLowerCase() === normalizedEmail
        );

        // Acepta passwords 'admin123' o '1234' para admin, 'user123' o '1234' para user, o contraseña directa
        const isDefaultMatch =
          (normalizedEmail === 'admin@empresa.com' && (credentials.password === 'admin123' || credentials.password === '1234')) ||
          (normalizedEmail === 'user@empresa.com' && (credentials.password === 'user123' || credentials.password === '1234')) ||
          (user && credentials.password.length >= 4);

        if (user && isDefaultMatch) {
          const token = `mock-jwt-token.${btoa(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + 3600000 }))}`;
          
          user.lastLogin = new Date().toISOString();
          this.persistUsers();

          const newState: AuthState = {
            isAuthenticated: true,
            currentUser: user,
            token
          };

          this.authState$.next(newState);

          if (credentials.rememberMe !== false) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          }

          return { success: true, message: 'Autenticación correcta', user };
        }

        return { success: false, message: 'Credenciales inválidas. Revisa tu correo o contraseña.' };
      })
    );
  }

  /**
   * Alta de nuevo usuario (Fase 1 - Paso 1.2)
   */
  public register(dto: RegisterDto): Observable<{ success: boolean; message: string; user?: User }> {
    return of(null).pipe(
      delay(700),
      map(() => {
        const emailExists = this.registeredUsers.some(
          u => u.email.toLowerCase() === dto.email.trim().toLowerCase()
        );

        if (emailExists) {
          return { success: false, message: 'El correo electrónico ya está registrado en el sistema.' };
        }

        const newUser: User = {
          id: `usr-${Date.now()}`,
          email: dto.email.trim().toLowerCase(),
          name: dto.fullName.trim(),
          role: dto.role,
          company: dto.companyName.trim(),
          dniCif: dto.dniCif.trim().toUpperCase(),
          phone: dto.phone?.trim() ?? '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        this.registeredUsers.push(newUser);
        this.persistUsers();

        // Autentica automáticamente al nuevo usuario
        const token = `mock-jwt-token.${btoa(JSON.stringify({ sub: newUser.id, role: newUser.role }))}`;
        const newState: AuthState = {
          isAuthenticated: true,
          currentUser: newUser,
          token
        };
        this.authState$.next(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

        return { success: true, message: 'Usuario registrado con éxito', user: newUser };
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
    localStorage.removeItem(STORAGE_KEY);
    this.authState$.next({
      isAuthenticated: false,
      currentUser: null,
      token: null
    });
  }
}
