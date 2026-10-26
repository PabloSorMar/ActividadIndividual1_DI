import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';

/**
 * Página de Acceso Restringido (RA 1 - Paso 1.1).
 * Notifica al usuario cuando sus credenciales/rol no son suficientes para acceder a la ruta.
 */
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonBadge],
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.scss']
})
export class UnauthorizedPage {
  public authService = inject(AuthService);
  private router = inject(Router);
  public route = inject(ActivatedRoute);

  public requiredRole: string = this.route.snapshot.queryParams['requiredRole'] || 'admin';
  public currentRole: string = this.authService.getUserRole() || 'user';

  public goBack(): void {
    if (this.currentRole === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/user-dashboard']);
    }
  }

  public reloginAsAdmin(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
