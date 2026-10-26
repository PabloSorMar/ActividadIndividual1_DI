import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ModalController
} from '@ionic/angular';
import { forkJoin, Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { SqlDatabaseService } from '../../core/services/sql-database.service';
import { RealtimeDocService } from '../../core/services/realtime-doc.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuditLog, Customer, DashboardMetrics, Invoice } from '../../core/models/business.models';
import { TableAction, TableActionEvent, TableColumn } from '../../core/models/component.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { HelpModalComponent } from '../../shared/components/help-modal/help-modal.component';

Chart.register(...registerables);

/**
 * Cuadro de Mando del Administrador (Fases 2, 3 y 4).
 * Integra visualización interactiva Chart.js, orquestación asíncrona concurrentes (forkJoin),
 * consumo dual SQL/NoSQL, componentes reutilizables y exportación a PDF y CSV.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    StatCardComponent,
    DataTableComponent
  ],
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChartCanvas') revenueCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChartCanvas') statusCanvasRef!: ElementRef<HTMLCanvasElement>;

  public authService = inject(AuthService);
  private sqlDb = inject(SqlDatabaseService);
  private realtimeDoc = inject(RealtimeDocService);
  private exportService = inject(ReportExportService);
  private notificationService = inject(NotificationService);
  private modalCtrl = inject(ModalController);

  public isLoading: boolean = true;
  public selectedFilter: 'all' | 'year' | 'month' = 'all';

  // Datos consolidados
  public metrics: DashboardMetrics | null = null;
  public invoices: Invoice[] = [];
  public customers: Customer[] = [];
  public liveLogs: AuditLog[] = [];

  // Instancias de Chart.js
  private revenueChart: Chart | null = null;
  private statusChart: Chart | null = null;

  // Suscripciones
  private dataSub?: Subscription;
  private logsSub?: Subscription;

  // Configuración agnóstica para DataTableComponent
  public tableColumns: TableColumn<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Nº Factura', sortable: true, width: '130px' },
    { key: 'customerName', header: 'Cliente / Empresa', sortable: true },
    { key: 'date', header: 'Emisión', sortable: true, type: 'date', width: '110px' },
    { key: 'dueDate', header: 'Vencimiento', sortable: true, type: 'date', width: '110px' },
    { key: 'amount', header: 'Importe', sortable: true, type: 'currency', align: 'right', width: '120px' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      type: 'badge',
      align: 'center',
      width: '110px',
      badgeColorMap: {
        pagada: 'success',
        pendiente: 'warning',
        vencida: 'danger',
        anulada: 'medium'
      }
    }
  ];

  public tableActions: TableAction<Invoice>[] = [
    { id: 'view', label: 'Ver detalles', icon: 'eye-outline', color: 'primary' },
    { id: 'toggle-status', label: 'Cambiar estado', icon: 'swap-horizontal-outline', color: 'secondary' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.subscribeToRealtimeLogs();
  }

  ngAfterViewInit(): void {
    // Si los datos ya cargaron antes de AfterViewInit, renderiza los gráficos
    if (!this.isLoading && this.metrics) {
      this.initCharts();
    }
  }

  /**
   * Orquestación asíncrona avanzada con forkJoin (RA 5 Sobresaliente).
   * Consume concurrentemente orígenes SQL relacionales y prepara métricas consolidadas.
   */
  public loadData(): void {
    this.isLoading = true;

    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }

    this.dataSub = forkJoin({
      metrics: this.sqlDb.getDashboardMetrics(this.selectedFilter),
      invoices: this.sqlDb.getInvoices(),
      customers: this.sqlDb.getCustomers()
    }).subscribe({
      next: (result) => {
        this.metrics = result.metrics;
        this.invoices = result.invoices;
        this.customers = result.customers;
        this.isLoading = false;

        setTimeout(() => {
          this.initCharts();
        }, 80);
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showToast('Error al orquestar la carga de fuentes de datos', 'danger');
      }
    });
  }

  /**
   * Suscripción en tiempo real al stream NoSQL (RA 5 - Consumo Dual)
   */
  private subscribeToRealtimeLogs(): void {
    this.logsSub = this.realtimeDoc.logs$.subscribe(logs => {
      this.liveLogs = logs;
    });
  }

  /**
   * Filtros interactivos en tiempo real (Paso 3.2)
   */
  public onFilterChange(event: any): void {
    this.selectedFilter = event.detail.value;
    this.loadData();
    this.realtimeDoc.addLog(
      'Filtro Aplicado',
      `Cuadro de mando filtrado por rango: ${this.selectedFilter.toUpperCase()}`,
      'info',
      this.authService.getCurrentUser()?.name || 'Admin',
      'admin'
    );
  }

  /**
   * Inicialización y renderizado de gráficos visuales Chart.js
   */
  private initCharts(): void {
    if (!this.metrics) return;

    // 1. Gráfico de Evolución Mensual
    if (this.revenueCanvasRef?.nativeElement) {
      if (this.revenueChart) {
        this.revenueChart.destroy();
      }

      const ctxRev = this.revenueCanvasRef.nativeElement.getContext('2d');
      if (ctxRev) {
        this.revenueChart = new Chart(ctxRev, {
          type: 'bar',
          data: {
            labels: this.metrics.monthlyRevenue.map(m => m.month),
            datasets: [
              {
                label: 'Facturación Real (€)',
                data: this.metrics.monthlyRevenue.map(m => m.amount),
                backgroundColor: 'rgba(56, 128, 255, 0.85)',
                borderRadius: 8,
                borderSkipped: false
              },
              {
                label: 'Objetivo (€)',
                data: this.metrics.monthlyRevenue.map(m => m.target),
                type: 'line',
                borderColor: '#10b981',
                borderWidth: 2,
                pointBackgroundColor: '#10b981',
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'inherit', size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (item) => `${item.dataset.label}: ${Number(item.raw).toLocaleString('es-ES')} €`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                  callback: (val) => `${Number(val) / 1000}k €`,
                  font: { size: 10 }
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        });
      }
    }

    // 2. Gráfico Donut de Distribución por Estados
    if (this.statusCanvasRef?.nativeElement) {
      if (this.statusChart) {
        this.statusChart.destroy();
      }

      const ctxStatus = this.statusCanvasRef.nativeElement.getContext('2d');
      if (ctxStatus) {
        const labels = this.metrics.invoicesByStatus.map(s => s.status.toUpperCase());
        const counts = this.metrics.invoicesByStatus.map(s => s.count);

        this.statusChart = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              {
                data: counts,
                backgroundColor: [
                  '#2dd36f', // Pagada
                  '#ffc409', // Pendiente
                  '#eb445a', // Vencida
                  '#92949c'  // Anulada
                ],
                borderWidth: 2,
                hoverOffset: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 12, font: { size: 11 } }
              }
            },
            cutout: '68%'
          }
        });
      }
    }
  }

  /**
   * Exportación a CSV (Paso 3.3)
   */
  public exportCsv(): void {
    this.exportService.exportToCsv(
      `Informe_Facturas_NovaGestion_${new Date().toISOString().split('T')[0]}`,
      this.invoices,
      [
        { key: 'invoiceNumber', header: 'Nº Factura' },
        { key: 'customerName', header: 'Cliente' },
        { key: 'date', header: 'Fecha Emisión' },
        { key: 'dueDate', header: 'Fecha Vencimiento' },
        { key: 'amount', header: 'Importe (€)' },
        { key: 'status', header: 'Estado' }
      ]
    );

    this.notificationService.showToast('Informe CSV descargado correctamente', 'success');
  }

  /**
   * Exportación a PDF corporativo con jsPDF (Paso 3.3)
   */
  public exportPdf(): void {
    if (!this.metrics) return;

    this.exportService.exportToPdf({
      title: 'Informe Consolidado de Facturación y Finanzas',
      subtitle: `Filtro seleccionado: ${this.selectedFilter.toUpperCase()} | Registros: ${this.invoices.length}`,
      filename: `Informe_Consolidado_NovaGestion_${new Date().toISOString().split('T')[0]}`,
      kpis: [
        { label: 'Facturación Total', value: `${this.metrics.totalRevenue.toLocaleString('es-ES')} €` },
        { label: 'Clientes Activos', value: `${this.metrics.activeCustomers}` },
        { label: 'Facturas Pendientes', value: `${this.metrics.pendingInvoices} (${this.metrics.pendingInvoicesAmount.toLocaleString('es-ES')} €)` }
      ],
      columns: [
        { header: 'Nº Factura', key: 'invoiceNumber' },
        { header: 'Cliente', key: 'customerName' },
        { header: 'Emisión', key: 'date' },
        { header: 'Vencimiento', key: 'dueDate' },
        { header: 'Importe (€)', key: 'amount' },
        { header: 'Estado', key: 'status' }
      ],
      rows: this.invoices.map(i => ({
        ...i,
        amount: `${i.amount.toLocaleString('es-ES')} €`,
        status: i.status.toUpperCase()
      }))
    });

    this.notificationService.showToast('Informe PDF corporativo generado con éxito', 'success');
  }

  /**
   * Gestión de eventos de fila del DataTableComponent (Paso 2.2)
   */
  public onTableAction(event: TableActionEvent<Invoice>): void {
    const inv = event.row;
    if (event.action === 'view') {
      this.notificationService.showAlert(
        `Detalle de Factura: ${inv.invoiceNumber}`,
        `Cliente: ${inv.customerName}\nImporte: ${inv.amount.toLocaleString('es-ES')} €\nEstado: ${inv.status.toUpperCase()}\nEmisión: ${inv.date} | Vence: ${inv.dueDate}`
      );
    } else if (event.action === 'toggle-status') {
      const nextStatus = inv.status === 'pagada' ? 'pendiente' : 'pagada';
      this.sqlDb.updateInvoiceStatus(inv.id, nextStatus).subscribe(() => {
        inv.status = nextStatus;
        this.notificationService.showToast(`Factura ${inv.invoiceNumber} marcada como ${nextStatus.toUpperCase()}`, 'primary');
        this.realtimeDoc.addLog('Estado Modificado', `${inv.invoiceNumber} -> ${nextStatus}`, 'info');
      });
    }
  }

  public async openHelpModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }

  ngOnDestroy(): void {
    if (this.dataSub) this.dataSub.unsubscribe();
    if (this.logsSub) this.logsSub.unsubscribe();
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.statusChart) this.statusChart.destroy();
  }
}
