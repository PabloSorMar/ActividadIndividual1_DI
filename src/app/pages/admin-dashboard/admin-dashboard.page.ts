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
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  ModalController
} from '@ionic/angular';
import { forkJoin, Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { SqlDatabaseService } from '../../core/services/sql-database.service';
import { RealtimeDocService } from '../../core/services/realtime-doc.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuditLog, Customer, DashboardMetrics, Invoice } from '../../core/models/business.models';
import { Product } from '../../core/models/product.model';
import { TableAction, TableActionEvent, TableColumn } from '../../core/models/component.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { HelpModalComponent } from '../../shared/components/help-modal/help-modal.component';

import { environment } from '../../../environments/environment';

Chart.register(...registerables);

/**
 * Cuadro de Mando del Administrador con Pestañas de Centro de Mando, Clientes y Productos (Supabase).
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
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
  public supabaseService = inject(SupabaseService);
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);

  // Pestañas principales requeridas: Cuadro de Mando, Clientes y Productos
  public activeAdminTab: 'dashboard' | 'clients' | 'products' = 'dashboard';

  public isLoading: boolean = true;
  public selectedFilter: 'all' | 'year' | 'month' = 'all';

  // Datos consolidados
  public metrics: DashboardMetrics | null = null;
  public invoices: Invoice[] = [];
  public customers: Customer[] = [];
  public products: Product[] = [];
  public liveLogs: AuditLog[] = [];

  // Modal para Añadir Producto
  public isProductModalOpen: boolean = false;
  public productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Hardware', [Validators.required]],
    price: [199.99, [Validators.required, Validators.min(0.01)]],
    stock: [10, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  // Instancias de Chart.js
  private revenueChart: Chart | null = null;
  private statusChart: Chart | null = null;

  // Suscripciones
  private dataSub?: Subscription;
  private logsSub?: Subscription;

  // Columnas para Facturas
  public invoiceColumns: TableColumn<Invoice>[] = [
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

  public invoiceActions: TableAction<Invoice>[] = [
    { id: 'view', label: 'Ver detalles', icon: 'eye-outline', color: 'primary' },
    { id: 'toggle-status', label: 'Cambiar estado', icon: 'swap-horizontal-outline', color: 'secondary' }
  ];

  // Columnas para Clientes (Pestaña Clientes de Supabase)
  public customerColumns: TableColumn<any>[] = [
    { key: 'nombre', header: 'Cliente / Nombre', sortable: true },
    { key: 'empresa', header: 'Empresa / Razón Social', sortable: true },
    { key: 'email', header: 'Correo Electrónico', sortable: true },
    { key: 'created_at', header: 'Fecha Alta', sortable: true, type: 'date', width: '130px' }
  ];

  public customerActions: TableAction<any>[] = [
    { id: 'delete', label: 'Eliminar de Supabase', icon: 'trash-outline', color: 'danger' }
  ];

  // Modal para Añadir Cliente a Supabase
  public isClientModalOpen: boolean = false;
  public clientForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    empresa: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  // Columnas para Productos (Pestaña Productos de Supabase)
  public productColumns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nombre del Producto', sortable: true },
    { key: 'description', header: 'Descripción', sortable: true },
    { key: 'price', header: 'Precio Unitario', sortable: true, type: 'currency', align: 'right', width: '140px' },
    { key: 'stock', header: 'Stock en Almacén', sortable: true, align: 'center', width: '140px' },
    { key: 'created_at', header: 'Fecha Alta', sortable: true, type: 'date', width: '120px' }
  ];

  public productActions: TableAction<Product>[] = [
    { id: 'delete', label: 'Eliminar de Supabase', icon: 'trash-outline', color: 'danger' }
  ];

  // Alias para compatibilidad de plantilla
  public get tableColumns(): TableColumn<Invoice>[] {
    return this.invoiceColumns;
  }
  public get tableActions(): TableAction<Invoice>[] {
    return this.invoiceActions;
  }

  // Modal para Configurar Clave Supabase en caliente
  public isKeyModalOpen: boolean = false;
  public tempAnonKey: string = environment.supabaseKey !== 'TU_SUPABASE_ANON_KEY' ? environment.supabaseKey : '';

  public openKeyModal(): void {
    this.tempAnonKey = environment.supabaseKey !== 'TU_SUPABASE_ANON_KEY' ? environment.supabaseKey : '';
    this.isKeyModalOpen = true;
  }

  public async saveAnonKey(): Promise<void> {
    if (this.tempAnonKey.trim()) {
      this.supabaseService.setAnonKey(this.tempAnonKey.trim());
      this.isKeyModalOpen = false;
      this.notificationService.showToast('Clave anon de Supabase configurada con éxito', 'success');
      await this.loadProducts();
      await this.loadClients();
    }
  }

  ngOnInit(): void {
    this.loadData();
    this.loadProducts();
    this.loadClients();
    this.subscribeToRealtimeLogs();
  }

  ngAfterViewInit(): void {
    if (!this.isLoading && this.metrics && this.activeAdminTab === 'dashboard') {
      this.initCharts();
    }
  }

  public onTabChange(tab: any): void {
    if (tab === 'dashboard' || tab === 'clients' || tab === 'products') {
      this.activeAdminTab = tab;
      if (tab === 'dashboard') {
        setTimeout(() => this.initCharts(), 80);
      } else if (tab === 'products') {
        this.loadProducts();
      } else if (tab === 'clients') {
        this.loadClients();
      }
    }
  }

  public loadData(): void {
    this.isLoading = true;

    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }

    this.dataSub = forkJoin({
      metrics: this.sqlDb.getDashboardMetrics(this.selectedFilter),
      invoices: this.sqlDb.getInvoices()
    }).subscribe({
      next: (result) => {
        this.metrics = result.metrics;
        this.invoices = result.invoices;
        if (this.metrics && this.customers) {
          this.metrics.activeCustomers = this.customers.length;
        }
        this.isLoading = false;

        if (this.activeAdminTab === 'dashboard') {
          setTimeout(() => {
            this.initCharts();
          }, 80);
        }
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showToast('Error al orquestar la carga de fuentes de datos', 'danger');
      }
    });

    this.loadClients();
  }

  public async loadClients(): Promise<void> {
    try {
      this.customers = await this.supabaseService.getClients();
      if (this.metrics) {
        this.metrics.activeCustomers = this.customers.length;
      }
    } catch (e: any) {
      console.warn('Error cargando clientes de Supabase:', e);
    }
  }

  public async loadProducts(): Promise<void> {
    try {
      this.products = await this.supabaseService.getProducts();
    } catch (e: any) {
      console.warn('Error cargando productos:', e);
    }
  }

  private subscribeToRealtimeLogs(): void {
    this.logsSub = this.realtimeDoc.logs$.subscribe(logs => {
      this.liveLogs = logs;
    });
  }

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

  // =================== GESTIÓN DE PRODUCTOS (SUPABASE) ===================

  public openNewProductModal(): void {
    this.productForm.reset({
      name: '',
      category: 'Hardware',
      price: 199.99,
      stock: 10,
      description: ''
    });
    this.isProductModalOpen = true;
  }

  public async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const val = this.productForm.value;
    await this.notificationService.showLoading('Guardando producto en Supabase...');

    try {
      const added = await this.supabaseService.addProduct({
        name: val.name,
        category: val.category,
        price: Number(val.price),
        stock: Number(val.stock),
        description: val.description || ''
      });

      await this.notificationService.dismissLoading();
      this.isProductModalOpen = false;
      await this.loadProducts();

      this.notificationService.showToast(`Producto "${added.name}" guardado en Supabase`, 'success');
      this.realtimeDoc.addLog('Producto Supabase', `Añadido: ${added.name} (${added.price} €)`, 'success');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error guardando en Supabase: ' + e?.message, 'danger');
    }
  }

  public async onProductAction(event: TableActionEvent<Product>): Promise<void> {
    const prod = event.row;
    if (event.action === 'delete' && prod.id) {
      const ok = await this.notificationService.showConfirm(
        'Eliminar Producto',
        `¿Deseas eliminar "${prod.name}" de la base de datos de Supabase?`
      );

      if (ok) {
        await this.notificationService.showLoading('Eliminando de Supabase...');
        try {
          await this.supabaseService.deleteProduct(prod.id);
          await this.notificationService.dismissLoading();
          await this.loadProducts();
          this.notificationService.showToast(`Producto "${prod.name}" eliminado de Supabase`, 'warning');
          this.realtimeDoc.addLog('Producto Supabase', `Eliminado: ${prod.name}`, 'danger');
        } catch (e: any) {
          await this.notificationService.dismissLoading();
          this.notificationService.showToast('Error al eliminar de Supabase: ' + e?.message, 'danger');
        }
      }
    }
  }

  // =================== GESTIÓN DE CLIENTES (SUPABASE) ===================

  public openNewClientModal(): void {
    this.clientForm.reset({
      nombre: '',
      empresa: '',
      email: ''
    });
    this.isClientModalOpen = true;
  }

  public async saveClient(): Promise<void> {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const val = this.clientForm.value;
    await this.notificationService.showLoading('Guardando cliente en Supabase...');

    try {
      await this.supabaseService.addClient({
        nombre: val.nombre,
        empresa: val.empresa,
        email: val.email
      });
      await this.notificationService.dismissLoading();
      this.isClientModalOpen = false;
      await this.loadClients();
      this.notificationService.showToast(`Cliente "${val.nombre}" guardado en Supabase`, 'success');
      this.realtimeDoc.addLog('Cliente Supabase', `Añadido: ${val.nombre} (${val.empresa})`, 'success');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error guardando en Supabase: ' + e?.message, 'danger');
    }
  }

  public async onClientAction(event: TableActionEvent<any>): Promise<void> {
    const cl = event.row;
    if (event.action === 'delete' && cl.id) {
      const ok = await this.notificationService.showConfirm(
        'Eliminar Cliente',
        `¿Deseas eliminar a "${cl.nombre}" de la base de datos de Supabase?`
      );

      if (ok) {
        await this.notificationService.showLoading('Eliminando cliente de Supabase...');
        try {
          await this.supabaseService.deleteClient(cl.id);
          await this.notificationService.dismissLoading();
          await this.loadClients();
          this.notificationService.showToast(`Cliente "${cl.nombre}" eliminado de Supabase`, 'warning');
          this.realtimeDoc.addLog('Cliente Supabase', `Eliminado: ${cl.nombre}`, 'danger');
        } catch (e: any) {
          await this.notificationService.dismissLoading();
          this.notificationService.showToast('Error al eliminar de Supabase: ' + e?.message, 'danger');
        }
      }
    }
  }

  // =================== GRÁFICOS CHART.JS ===================

  private initCharts(): void {
    if (!this.metrics) return;

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
                backgroundColor: 'rgba(37, 99, 235, 0.85)',
                borderRadius: 8,
                borderSkipped: false
              },
              {
                label: 'Objetivo (€)',
                data: this.metrics.monthlyRevenue.map(m => m.target),
                type: 'line',
                borderColor: '#059669',
                borderWidth: 2,
                pointBackgroundColor: '#059669',
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
                backgroundColor: ['#059669', '#d97706', '#dc2626', '#94a3b8'],
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

  // =================== EXPORTACIÓN ===================

  public exportCsv(): void {
    if (this.activeAdminTab === 'products') {
      this.exportService.exportToCsv(
        `Productos_Supabase_${new Date().toISOString().split('T')[0]}`,
        this.products,
        [
          { key: 'name', header: 'Nombre' },
          { key: 'category', header: 'Categoria' },
          { key: 'price', header: 'Precio' },
          { key: 'stock', header: 'Stock' },
          { key: 'description', header: 'Descripcion' }
        ]
      );
    } else if (this.activeAdminTab === 'clients') {
      this.exportService.exportToCsv(
        `Clientes_${new Date().toISOString().split('T')[0]}`,
        this.customers,
        [
          { key: 'name', header: 'Cliente' },
          { key: 'cif', header: 'CIF' },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Telefono' },
          { key: 'totalSpent', header: 'GastoTotal' },
          { key: 'status', header: 'Estado' }
        ]
      );
    } else {
      this.exportService.exportToCsv(
        `Informe_Facturas_${new Date().toISOString().split('T')[0]}`,
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
    }
    this.notificationService.showToast('Informe CSV descargado correctamente', 'success');
  }

  public exportPdf(): void {
    if (this.activeAdminTab === 'products') {
      this.exportService.exportToPdf({
        title: 'Catálogo de Productos (Sincronizado Supabase)',
        subtitle: `Total referencias registradas: ${this.products.length}`,
        filename: `Productos_Supabase_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Producto', key: 'name' },
          { header: 'Categoría', key: 'category' },
          { header: 'Precio Unitario', key: 'price' },
          { header: 'Stock', key: 'stock' }
        ],
        rows: this.products.map(p => ({
          ...p,
          price: `${p.price.toLocaleString('es-ES')} €`,
          stock: `${p.stock} uds`
        }))
      });
    } else if (this.activeAdminTab === 'clients') {
      this.exportService.exportToPdf({
        title: 'Maestro de Clientes y Cuentas',
        subtitle: `Total clientes: ${this.customers.length}`,
        filename: `Clientes_NovaGestion_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Cliente', key: 'name' },
          { header: 'CIF/NIF', key: 'cif' },
          { header: 'Email', key: 'email' },
          { header: 'Gasto Total', key: 'totalSpent' },
          { header: 'Estado', key: 'status' }
        ],
        rows: this.customers.map(c => ({
          ...c,
          totalSpent: `${c.totalSpent.toLocaleString('es-ES')} €`,
          status: c.status.toUpperCase()
        }))
      });
    } else {
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
    }
    this.notificationService.showToast('Informe PDF corporativo generado con éxito', 'success');
  }

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
