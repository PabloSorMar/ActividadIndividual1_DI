import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton,
  IonSpinner
} from '@ionic/angular';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

interface FAQItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

/**
 * Página de Contacto y Soporte de ClieGestion:
 * Proporciona canales de atención directa, formulario de contacto reactivo
 * y sección de preguntas frecuentes (FAQ) interactivas.
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonSpinner
  ],
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss']
})
export class ContactPage {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  public contactForm: FormGroup;
  public isSubmitting = false;

  public readonly contactChannels = [
    {
      title: 'Atención Telefónica',
      detail: '+34 900 123 456',
      sub: 'Lunes a Viernes de 08:00 a 19:00',
      icon: 'call-outline',
      color: 'primary'
    },
    {
      title: 'Correo Corporativo',
      detail: 'soporte@cliegestion.com',
      sub: 'Respuesta estimada < 2 horas laborales',
      icon: 'mail-outline',
      color: 'success'
    },
    {
      title: 'Sede Central',
      detail: 'Parque Tecnológico Empresarial',
      sub: 'Edificio Innova, Planta 4, Valencia',
      icon: 'location-outline',
      color: 'warning'
    },
    {
      title: 'Soporte Urgente 24/7',
      detail: 'Guardia de Incidencias',
      sub: 'Para caídas de servicio o tickets críticos',
      icon: 'shield-checkmark-outline',
      color: 'danger'
    }
  ];

  public faqs: FAQItem[] = [
    {
      question: '¿Cómo reportar una incidencia técnica o ticket?',
      answer: 'Desde tu portal de usuario o cuadro de mando administrativo, dirígete al apartado de Tickets y haz clic en "Nuevo Ticket". Selecciona el nivel de prioridad y describe el suceso; nuestro equipo lo atenderá de inmediato.',
      isOpen: false
    },
    {
      question: '¿Dónde se almacenan las fotos de perfil y catálogo?',
      answer: 'Todas las imágenes se gestionan de forma segura en los buckets "perfiles" y "galeria" de Supabase Storage, con políticas de acceso y caché CDN optimizada.',
      isOpen: false
    },
    {
      question: '¿Cómo exportar listados de clientes y productos a PDF o CSV?',
      answer: 'En la sección de gestión o en las tablas correspondientes, dispones de los botones "Exportar PDF" y "Exportar CSV" que generan el informe tabulado y formateado en un clic.',
      isOpen: false
    },
    {
      question: '¿Cómo activar o alternar el modo oscuro?',
      answer: 'Puedes pulsar el interruptor de modo oscuro/claro situado en la esquina superior derecha de la barra de navegación para alternar de forma inmediata con persistencia local.',
      isOpen: false
    }
  ];

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    this.contactForm = this.fb.group({
      name: [currentUser?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [currentUser?.email || '', [Validators.required, Validators.email]],
      category: ['soporte', [Validators.required]],
      subject: ['', [Validators.required, Validators.minLength(4)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  public toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  public async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      await this.notificationService.showToast(
        'Por favor, completa correctamente todos los campos obligatorios del formulario.',
        'warning'
      );
      return;
    }

    this.isSubmitting = true;

    // Simulación de envío telemático con confirmación
    setTimeout(async () => {
      this.isSubmitting = false;
      const currentUser = this.authService.getCurrentUser();
      this.contactForm.reset({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        category: 'soporte',
        subject: '',
        message: ''
      });

      await this.notificationService.showToast(
        'Mensaje transmitido con éxito. El equipo de ClieGestion contactará contigo en breve.',
        'success',
        4000
      );
    }, 900);
  }
}
