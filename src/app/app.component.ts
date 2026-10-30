import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonBadge,
  IonButton,
  IonButtons,
  IonMenuToggle,
  IonMenuButton,
  IonRouterOutlet,
  IonFooter,
  ModalController
} from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { HelpModalComponent } from './shared/components/help-modal/help-modal.component';

/**
 * Componente Raíz de la Aplicación (Fase 1 y Fase 4).
 * Integra el Sistema Global de Navegación (Side Menu adaptable con Split Pane),
 * control de tema oscuro/claro y acceso universal al manual de ayuda.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonButton,
    IonButtons,
    IonMenuToggle,
    IonMenuButton,
    IonRouterOutlet,
    IonFooter
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private modalCtrl = inject(ModalController);

  public isDarkMode: boolean = true;

  ngOnInit(): void {
    this.initTheme();
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  private initTheme(): void {
    const saved = localStorage.getItem('cliegestion_theme') || localStorage.getItem('novagestion_theme');
    // Requerimiento: El tema inicial debe ser oscuro por defecto
    const isDark = saved !== 'light';
    this.isDarkMode = isDark;
    if (isDark) {
      document.body.classList.add('ion-palette-dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('ion-palette-dark');
      document.documentElement.classList.remove('dark');
    }
  }

  public toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('ion-palette-dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cliegestion_theme', 'dark');
      localStorage.setItem('novagestion_theme', 'dark');
      this.notification.showToast('Modo oscuro activado', 'medium', 1500);
    } else {
      document.body.classList.remove('ion-palette-dark');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cliegestion_theme', 'light');
      localStorage.setItem('novagestion_theme', 'light');
      this.notification.showToast('Modo claro activado', 'medium', 1500);
    }
  }

  public async openHelp(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }

  public async logout(): Promise<void> {
    const ok = await this.notification.showConfirm('Cerrar Sesión', '¿Estás seguro de que deseas salir del sistema?');
    if (ok) {
      await this.notification.dismissLoading();
      this.authService.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
      this.notification.showToast('Sesión finalizada correctamente', 'medium');
    }
  }
}
