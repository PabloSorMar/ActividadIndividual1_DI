import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

/**
 * Componente visual agnóstico de tarjeta estadística / KPI (RA 3).
 * Utiliza ChangeDetectionStrategy.OnPush para máximo rendimiento (RA 2 Sobresaliente).
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon: string = 'stats-chart';
  @Input() trend?: number;
  @Input() trendLabel: string = 'vs. mes anterior';
  @Input() color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() prefix?: string;
  @Input() suffix?: string;
  @Input() description?: string;
  @Input() clickable: boolean = false;

  @Output() cardClick = new EventEmitter<string>();

  onCardClicked(): void {
    if (this.clickable) {
      this.cardClick.emit(this.title);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.cardClick.emit(this.title);
    }
  }
}
