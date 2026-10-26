import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonItem, IonInput, IonButton } from '@ionic/angular';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonItem, 
    IonInput, 
    IonButton
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService) {}

  onLogin() {
    const success = this.authService.login(this.email, this.password);
    if (!success) {
      alert('Credenciales incorrectas. Usa admin@empresa.com o user@empresa.com con pass: 1234');
    }
  }
}