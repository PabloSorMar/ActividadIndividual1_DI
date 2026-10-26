import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonBadge
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Página de Inicio de Sesión (Fase 1 - Paso 1.2).
 * Implementa Formularios Reactivos, manejo de errores UX y acceso rápido para evaluación.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonSpinner,
    IonCard,
    IonCardContent
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public loginForm: FormGroup = this.fb.group({
    email: ['admin@empresa.com', [Validators.required, Validators.email]],
    password: ['admin123', [Validators.required, Validators.minLength(4)]],
    rememberMe: [true]
  });

  public isSubmitting: boolean = false;
  public errorMessage: string = '';

  /**
   * Auto-rellena credenciales de prueba para facilitar la corrección docente
   */
  public fillCredentials(role: 'admin' | 'user'): void {
    if (role === 'admin') {
      this.loginForm.patchValue({
        email: 'admin@empresa.com',
        password: 'admin123'
      });
    } else {
      this.loginForm.patchValue({
        email: 'user@empresa.com',
        password: 'user123'
      });
    }
    this.errorMessage = '';
  }

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Por favor, completa correctamente los campos obligatorios.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login({ email, password, rememberMe }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success && res.user) {
          this.notificationService.showToast(
            `¡Bienvenido de nuevo, ${res.user.name}!`,
            'success'
          );

          // Redirección según rol o returnUrl previa
          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else if (res.user.role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/user-dashboard']);
          }
        } else {
          this.errorMessage = res.message;
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Error de conexión con el servicio de autenticación.';
      }
    });
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
