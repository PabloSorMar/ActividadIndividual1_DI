import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonInput,
  IonTextarea,
  ModalController
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeDocService } from '../../core/services/realtime-doc.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { HelpModalComponent } from '../../shared/components/help-modal/help-modal.component';

export interface UserTask {
  id: string;
  title: string;
  category: string;
  status: 'completada' | 'en_progreso' | 'pendiente';
  date: string;
}

/**
 * Portal del Usuario Estándar (RA 1 - Paso 1.1).
 * Demuestra control de acceso por roles diferenciados y vistas especializadas.
 */
@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonInput,
    IonTextarea,
    StatCardComponent
  ],
  templateUrl: './user-dashboard.page.html',
  styleUrls: ['./user-dashboard.page.scss']
})
export class UserDashboardPage implements OnInit {
  public authService = inject(AuthService);
  private notification = inject(NotificationService);
  private realtimeDoc = inject(RealtimeDocService);
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);

  public myTasks: UserTask[] = [
    { id: 'tsk-1', title: 'Revisión trimestral de accesibilidad WCAG', category: 'Calidad', status: 'en_progreso', date: '2026-03-25' },
    { id: 'tsk-2', title: 'Actualización de datos fiscales en el perfil', category: 'Cuenta', status: 'completada', date: '2026-03-20' },
    { id: 'tsk-3', title: 'Generación de resumen de facturación Q1', category: 'Informes', status: 'pendiente', date: '2026-03-30' }
  ];

  public requestForm: FormGroup = this.fb.group({
    subject: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  public isSubmittingRequest: boolean = false;

  ngOnInit(): void {}

  public submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.isSubmittingRequest = true;
    const { subject, description } = this.requestForm.value;

    setTimeout(() => {
      this.isSubmittingRequest = false;
      const newTask: UserTask = {
        id: `tsk-${Date.now()}`,
        title: subject,
        category: 'Soporte',
        status: 'pendiente',
        date: new Date().toISOString().split('T')[0]
      };

      this.myTasks.unshift(newTask);
      this.requestForm.reset();
      this.notification.showToast('Solicitud enviada al equipo de administración', 'success');

      this.realtimeDoc.addLog(
        'Solicitud de Usuario',
        `Nueva gestión: ${subject}`,
        'info',
        this.authService.getCurrentUser()?.name || 'Usuario',
        'user'
      );
    }, 500);
  }

  public async openHelpModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }
}
