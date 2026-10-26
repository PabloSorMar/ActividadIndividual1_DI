import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonBadge
} from '@ionic/angular';

/**
 * Modal interactivo con el Manual de Usuario integrado (RA 6 Sobresaliente).
 * Proporciona soporte contextual, atajos de accesibilidad y guía de roles.
 */
@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonBadge
  ],
  templateUrl: './help-modal.component.html',
  styleUrls: ['./help-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpModalComponent {
  private modalCtrl = inject(ModalController);

  public filterText: string = '';

  public dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
