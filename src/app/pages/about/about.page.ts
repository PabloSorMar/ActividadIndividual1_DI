import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonBadge,
  IonButton
} from '@ionic/angular';

/**
 * Página 'Sobre Nosotros' de ClieGestion:
 * Muestra la información corporativa, misión, visión, métricas clave
 * y pilares tecnológicos de la empresa.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonBadge,
    IonButton
  ],
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss']
})
export class AboutPage {
  public readonly impactMetrics = [
    { value: '+10.000', label: 'Clientes y Empresas', icon: 'business-outline', color: 'primary' },
    { value: '99.98%', label: 'Disponibilidad Cloud', icon: 'cloud-done-outline', color: 'success' },
    { value: '24/7', label: 'Soporte y Monitoreo', icon: 'shield-checkmark-outline', color: 'secondary' },
    { value: '+500K', label: 'Transacciones / Mes', icon: 'stats-chart-outline', color: 'warning' }
  ];

  public pillars = [
    {
      title: 'Persistencia en la Nube con Supabase',
      desc: 'Base de datos PostgreSQL en tiempo real y almacenamiento seguro de buckets para catálogos y perfiles.',
      icon: 'server-outline',
      badge: 'Bases de Datos'
    },
    {
      title: 'Arquitectura PWA Multiplataforma',
      desc: 'Construido sobre Angular e Ionic Framework para ofrecer rendimiento nativo y diseño adaptable responsive.',
      icon: 'phone-portrait-outline',
      badge: 'Front-End'
    },
    {
      title: 'Seguridad y Control de Acceso',
      desc: 'Gestión estricta de identidades mediante RBAC (Role-Based Access Control) y políticas RLS garantizadas.',
      icon: 'lock-closed-outline',
      badge: 'Ciberseguridad'
    },
    {
      title: 'Métricas y Exportación Tabulada',
      desc: 'Generación directa de informes en PDF corporativo y CSV con visualización gráfica interactiva con Chart.js.',
      icon: 'document-text-outline',
      badge: 'Analítica'
    }
  ];
}
