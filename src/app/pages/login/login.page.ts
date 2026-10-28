import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { SupabaseService } from '../../core/services/supabase.service';

/**
 * Página de Inicio de Sesión (Fase 1 - Paso 1.2).
 * Valida credenciales estrictamente contra Supabase.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  public supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    rememberMe: [true]
  });

  public isSubmitting: boolean = false;
  public errorMessage: string = '';
  public anonKeyInput: string = '';

  public saveKey(): void {
    if (this.anonKeyInput.trim()) {
      this.supabaseService.setAnonKey(this.anonKeyInput.trim());
      this.notificationService.showToast('Clave anon de Supabase guardada correctamente', 'success');
      this.errorMessage = '';
    }
  }

  public quickLogin(role: 'admin' | 'user'): void {
    if (role === 'admin') {
      this.loginForm.patchValue({
        email: 'admin@gmail.com',
        password: '123456'
      });
    } else {
      this.loginForm.patchValue({
        email: 'user@gmail.com',
        password: '123456'
      });
    }
    this.onSubmit();
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
