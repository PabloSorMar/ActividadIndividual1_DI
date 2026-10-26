import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  IonButton,
  IonBadge,
  IonSpinner,
  IonSearchbar
} from '@ionic/angular';
import { TableAction, TableActionEvent, TableColumn } from '../../../core/models/component.models';

/**
 * Componente visual avanzado e independiente de Tabla de Datos (RA 3).
 * Implementa filtrado en vivo, ordenación multi-columna, paginación y emisión de eventos agnósticos.
 * Renderizado optimizado mediante ChangeDetectionStrategy.OnPush (RA 2 Sobresaliente).
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonButton,
    IonBadge,
    IonSpinner,
    IonSearchbar
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = any> implements OnChanges {
  @Input({ required: true }) data: T[] = [];
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input() title: string = '';
  @Input() pageSize: number = 6;
  @Input() searchPlaceholder: string = 'Filtrar registros...';
  @Input() actions: TableAction<T>[] = [];
  @Input() loading: boolean = false;
  @Input() emptyMessage: string = 'No se encontraron registros.';

  @Output() actionClick = new EventEmitter<TableActionEvent<T>>();
  @Output() rowClick = new EventEmitter<T>();
  @Output() searchChange = new EventEmitter<string>();

  // Estado interno de la tabla
  public searchTerm: string = '';
  public sortKey: string = '';
  public sortDirection: 'asc' | 'desc' = 'asc';
  public currentPage: number = 1;

  public filteredData: T[] = [];
  public paginatedData: T[] = [];
  public totalPages: number = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['pageSize']) {
      this.applyFilterAndPagination();
    }
  }

  public onSearchInput(event: any): void {
    const query = (event?.detail?.value || event?.target?.value || '').trim();
    this.searchTerm = query;
    this.currentPage = 1;
    this.searchChange.emit(this.searchTerm);
    this.applyFilterAndPagination();
  }

  public onSort(column: TableColumn<T>): void {
    if (!column.sortable) return;

    const key = String(column.key);
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.applyFilterAndPagination();
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.applyPaginationOnly();
  }

  public onAction(actionId: string, row: T, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.actionClick.emit({ action: actionId, row });
  }

  public onRowSelected(row: T): void {
    this.rowClick.emit(row);
  }

  private applyFilterAndPagination(): void {
    let result = [...(this.data || [])];

    // 1. Filtrado por término de búsqueda
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item => {
        return Object.values(item as any).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    // 2. Ordenación
    if (this.sortKey) {
      result.sort((a: any, b: any) => {
        const valA = a[this.sortKey];
        const valB = b[this.sortKey];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        }

        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredData = result;
    this.totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.applyPaginationOnly();
  }

  private applyPaginationOnly(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedData = this.filteredData.slice(startIndex, startIndex + this.pageSize);
  }

  public getCellValue(column: TableColumn<T>, row: T): any {
    const raw = (row as any)[column.key];
    if (column.formatter) {
      return column.formatter(raw, row);
    }
    return raw;
  }

  public getBadgeColor(column: TableColumn<T>, value: string): string {
    if (column.badgeColorMap && column.badgeColorMap[value]) {
      return column.badgeColorMap[value];
    }
    return 'medium';
  }

  public getPagesArray(): number[] {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(this.totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
