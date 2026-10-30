import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonSpinner,
  IonCard,
  IonCardContent
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CustomValidators } from '../../core/validators/custom-validators';
import { UserRole } from '../../core/models/auth.models';

/**
 * Página de Alta de Registros y Nuevo Usuario (Fase 1 - Paso 1.2).
 * Demuestra Formularios Reactivos con validación asíncrona real contra servicio (RA 2).
 */
@Component({
  selector: 'app-register',
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
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isSubmitting: boolean = false;
  public errorMessage: string = '';

  // Formulario reactivo con validadores síncronos y asíncronos contra servicio
  public registerForm: FormGroup = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [CustomValidators.uniqueEmail(this.authService)],
          updateOn: 'change'
        }
      ],
      dniCif: [
        '',
        {
          validators: [Validators.required, CustomValidators.spanishDniCif()],
          asyncValidators: [CustomValidators.uniqueDniCif(this.authService)],
          updateOn: 'change'
        }
      ],
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern(/^[0-9+ ]{9,15}$/)]],
      role: ['user' as UserRole, [Validators.required]],
      password: ['', [Validators.required, CustomValidators.securePassword()]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    },
    {
      validators: [CustomValidators.matchFields('password', 'confirmPassword')]
    }
  );

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  public isFieldPending(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.pending);
  }

  public isFieldSuccess(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched) && control.value);
  }

  public onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Por favor, revisa los campos señalados en rojo antes de continuar.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const val = this.registerForm.value;

    this.authService
      .register({
        fullName: val.fullName,
        email: val.email,
        dniCif: val.dniCif,
        companyName: val.companyName,
        phone: val.phone,
        role: 'user',
        password: val.password,
        acceptTerms: val.acceptTerms
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.success && res.user) {
            this.notificationService.showToast(
              `¡Registro completado! Bienvenido ${res.user.name}`,
              'success'
            );
            this.router.navigate(['/user-dashboard']);
          } else {
            this.errorMessage = res.message;
          }
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = 'Ocurrió un error al procesar el registro.';
        }
      });
  }
}
