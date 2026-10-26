import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Validadores reactivos y asíncronos para formularios (RA 2).
 */
export class CustomValidators {
  /**
   * Validador Asíncrono contra Servicio: Comprueba si el correo electrónico ya existe en la BD.
   * Utiliza debounce mediante timer para no saturar el servidor mientras el usuario teclea.
   */
  static uniqueEmail(authService: AuthService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.trim() === '') {
        return of(null);
      }

      // Espera 400ms después de que el usuario deje de teclear
      return timer(400).pipe(
        switchMap(() => authService.checkEmailAvailability(control.value)),
        map(isAvailable => (isAvailable ? null : { emailTaken: true })),
        catchError(() => of(null))
      );
    };
  }

  /**
   * Validador Asíncrono contra Servicio: Comprueba si el DNI o CIF ya está registrado.
   */
  static uniqueDniCif(authService: AuthService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.trim() === '') {
        return of(null);
      }

      return timer(400).pipe(
        switchMap(() => authService.checkDniAvailability(control.value)),
        map(isAvailable => (isAvailable ? null : { dniTaken: true })),
        catchError(() => of(null))
      );
    };
  }

  /**
   * Validador Síncrono: Formato de DNI español (8 números + 1 letra) o CIF (1 letra + 7 números + 1 carácter)
   */
  static spanishDniCif(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const val = control.value.trim().toUpperCase();
      const dniRegex = /^[0-9]{8}[A-Z]$/;
      const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;
      const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;

      const isValid = dniRegex.test(val) || cifRegex.test(val) || nieRegex.test(val);
      return isValid ? null : { invalidDniCif: true };
    };
  }

  /**
   * Validador Síncrono: Contraseña segura (mínimo 6 caracteres, al menos un número)
   */
  static securePassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const val = control.value;
      const hasNumber = /[0-9]/.test(val);
      const isLongEnough = val.length >= 6;

      if (!isLongEnough) {
        return { minLength: { requiredLength: 6, actualLength: val.length } };
      }
      if (!hasNumber) {
        return { requireNumber: true };
      }
      return null;
    };
  }

  /**
   * Validador de confirmación de contraseña coincidente
   */
  static matchFields(firstField: string, secondField: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const field1 = group.get(firstField)?.value;
      const field2 = group.get(secondField)?.value;

      if (field1 && field2 && field1 !== field2) {
        return { fieldsMismatch: true };
      }
      return null;
    };
  }
}
