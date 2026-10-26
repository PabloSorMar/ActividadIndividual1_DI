import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton]
})
export class StatCardComponent {
  // Recibe datos del componente padre (Inputs)
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() color: string = 'primary';

  // Notifica interacciones al componente padre (Outputs)
  @Output() cardClick = new EventEmitter<string>();

  onClick() {
    this.cardClick.emit(`Acción ejecutada desde la tarjeta: ${this.title}`);
  }
}