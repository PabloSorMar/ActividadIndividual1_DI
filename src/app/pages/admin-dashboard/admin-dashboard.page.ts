import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons, 
    IonButton,
    StatCardComponent
  ]
})
export class AdminDashboardPage {
  constructor(private authService: AuthService) {}

  onCardAction(message: string) {
    console.log(message);
    alert(message);
  }

  logout() {
    this.authService.logout();
  }
}