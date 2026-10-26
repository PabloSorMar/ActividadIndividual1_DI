import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: { email: string; role: 'admin' | 'user' } | null = null;

  constructor(private router: Router) {}

  login(email: string, pass: string): boolean {
    if (email === 'admin@empresa.com' && pass === '1234') {
      this.currentUser = { email, role: 'admin' };
      this.router.navigate(['/admin-dashboard']);
      return true;
    } else if (email === 'user@empresa.com' && pass === '1234') {
      this.currentUser = { email, role: 'user' };
      this.router.navigate(['/user-dashboard']);
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  getUserRole(): string | null {
    return this.currentUser ? this.currentUser.role : null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}