import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
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
  ModalController,
  ViewWillEnter,
  ViewDidEnter
} from '@ionic/angular';
import { forkJoin, interval, Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { SqlDatabaseService } from '../../core/services/sql-database.service';
import { RealtimeDocService } from '../../core/services/realtime-doc.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TicketService } from '../../core/services/ticket.service';
import { AuditLog, Customer, DashboardMetrics, Invoice } from '../../core/models/business.models';
import { Product } from '../../core/models/product.model';
import { Ticket, TicketPriority, TicketStatus } from '../../core/models/ticket.model';
import { TableAction, TableActionEvent, TableColumn } from '../../core/models/component.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { HelpModalComponent } from '../../shared/components/help-modal/help-modal.component';

Chart.register(...registerables);

/**
 * Cuadro de Mando del Administrador:
 * - Pestaña 1 "Centro de Mando": Distribución de productos en cantidad y tickets creados por usuarios (razón y prioridad).
 * - Pestaña 2 "Gestión de Clientes y Productos": Modificación integral (alta, edición, baja) en Supabase.
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
export class AdminDashboardPage implements OnInit, AfterViewInit, OnDestroy, ViewWillEnter, ViewDidEnter {
  @ViewChild('productStockCanvas') productStockCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketPriorityCanvas') ticketPriorityCanvasRef!: ElementRef<HTMLCanvasElement>;

  public authService = inject(AuthService);
  private sqlDb = inject(SqlDatabaseService);
  private realtimeDoc = inject(RealtimeDocService);
  private exportService = inject(ReportExportService);
  private notificationService = inject(NotificationService);
  public supabaseService = inject(SupabaseService);
  public ticketService = inject(TicketService);
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  // Pestañas principales requeridas: Centro de Mando y Gestión (Clientes / Productos)
  public activeAdminTab: 'dashboard' | 'management' = 'dashboard';
  public managementSubTab: 'products' | 'clients' = 'products';

  // Sincronización sin bloqueo para evitar pantalla congelada al entrar
  public isLoading: boolean = false;

  // Datos del sistema
  public products: Product[] = [];
  public customers: any[] = [];
  public tickets: Ticket[] = [];
  public liveLogs: AuditLog[] = [];

  // Instancias de Chart.js
  private productStockChart: Chart | null = null;
  private ticketPriorityChart: Chart | null = null;

  // Suscripciones
  private ticketsSub?: Subscription;
  private logsSub?: Subscription;
  private pollingSub?: Subscription;
  private supabaseChannel?: any;

  // =================== MODALES Y FORMULARIOS ===================
  // 1. Añadir Producto
  public isProductModalOpen: boolean = false;
  public productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Hardware', [Validators.required]],
    price: [199.99, [Validators.required, Validators.min(0.01)]],
    stock: [10, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  // 2. Modificar Producto
  public isEditProductModalOpen: boolean = false;
  public selectedProduct: Product | null = null;
  public editProductForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Hardware', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  // 3. Añadir Cliente
  public isClientModalOpen: boolean = false;
  public clientForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    empresa: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  // 4. Modificar Cliente
  public isEditClientModalOpen: boolean = false;
  public selectedClient: any = null;
  public editClientForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    empresa: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  // =================== TABLAS Y COLUMNAS ===================

  // 1. Tabla de Tickets (Centro de Mando)
  public ticketColumns: TableColumn<Ticket>[] = [
    { key: 'reason', header: 'Motivo / Razón del Ticket', sortable: true },
    {
      key: 'priority',
      header: 'Prioridad',
      sortable: true,
      type: 'badge',
      align: 'center',
      width: '120px',
      badgeColorMap: {
        urgente: 'danger',
        alta: 'warning',
        media: 'primary',
        baja: 'success'
      }
    },
    { key: 'userName', header: 'Usuario Solicitante', sortable: true, width: '160px' },
    { key: 'userEmail', header: 'Email Contacto', width: '180px' },
    { key: 'createdAt', header: 'Fecha Creación', sortable: true, width: '140px' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      type: 'badge',
      align: 'center',
      width: '120px',
      badgeColorMap: {
        abierto: 'danger',
        en_proceso: 'warning',
        resuelto: 'success'
      }
    }
  ];

  public ticketActions: TableAction<Ticket>[] = [
    {
      id: 'toggle-status',
      label: 'Cambiar Estado',
      icon: 'sync-outline',
      color: 'warning',
      fill: 'solid',
      showLabel: true
    },
    {
      id: 'delete',
      label: 'Borrar',
      icon: 'trash-outline',
      color: 'danger',
      fill: 'outline',
      showLabel: true
    }
  ];

  // 2. Tabla de Productos (Gestión)
  public productColumns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nombre del Producto', sortable: true },
    { key: 'description', header: 'Descripción' },
    { key: 'price', header: 'Precio Unitario', sortable: true, type: 'currency', align: 'right', width: '130px' },
    { key: 'stock', header: 'Cantidad en Stock', sortable: true, align: 'center', width: '140px' },
    { key: 'category', header: 'Categoría', sortable: true, width: '120px' }
  ];

  public productActions: TableAction<Product>[] = [
    { id: 'edit', label: 'Modificar', icon: 'create-outline', color: 'primary', fill: 'outline', showLabel: true },
    { id: 'delete', label: 'Borrar', icon: 'trash-outline', color: 'danger', fill: 'outline', showLabel: true }
  ];

  // 3. Tabla de Clientes (Gestión)
  public customerColumns: TableColumn<any>[] = [
    { key: 'nombre', header: 'Nombre / Contacto', sortable: true },
    { key: 'empresa', header: 'Empresa / Razón Social', sortable: true },
    { key: 'email', header: 'Correo Electrónico', sortable: true },
    { key: 'created_at', header: 'Fecha de Alta', sortable: true, type: 'date', width: '130px' }
  ];

  public customerActions: TableAction<any>[] = [
    { id: 'edit', label: 'Modificar', icon: 'create-outline', color: 'primary', fill: 'outline', showLabel: true },
    { id: 'delete', label: 'Borrar', icon: 'trash-outline', color: 'danger', fill: 'outline', showLabel: true }
  ];

  // =================== GETTERS COMPUTADOS ===================

  public get totalProductStock(): number {
    return this.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  }

  public get openTicketCount(): number {
    return this.tickets.filter(t => t.status !== 'resuelto').length;
  }

  public get urgentTicketCount(): number {
    return this.tickets.filter(t => t.priority === 'urgente' || t.priority === 'alta').length;
  }

  public get resolvedTicketCount(): number {
    return this.tickets.filter(t => t.status === 'resuelto').length;
  }

  // =================== CICLO DE VIDA ===================

  ngOnInit(): void {
    this.loadAllData();
    this.subscribeToTickets();
    this.subscribeToRealtimeLogs();
    this.setupRealtimeSubscriptions();
  }

  ionViewWillEnter(): void {
    // Sincronización proactiva al volver/entrar a la página sin bloquear la interfaz
    this.loadAllData();
  }

  ionViewDidEnter(): void {
    if (this.activeAdminTab === 'dashboard') {
      setTimeout(() => this.initDashboardCharts(), 60);
    }
  }

  ngAfterViewInit(): void {
    if (this.activeAdminTab === 'dashboard') {
      setTimeout(() => this.initDashboardCharts(), 60);
    }
  }

  public onTabChange(tab: any): void {
    this.activeAdminTab = tab;
    this.cdr.detectChanges();
    if (tab === 'dashboard') {
      setTimeout(() => this.initDashboardCharts(), 60);
    } else {
      this.loadProducts();
      this.loadClients();
    }
  }

  public onManagementSubTabChange(subTab: any): void {
    this.managementSubTab = subTab;
    this.cdr.detectChanges();
    if (subTab === 'products') {
      this.loadProducts();
    } else {
      this.loadClients();
    }
  }

  public async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      await Promise.all([this.loadProducts(), this.loadClients()]);
    } finally {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
        if (this.activeAdminTab === 'dashboard') {
          setTimeout(() => this.initDashboardCharts(), 60);
        }
      });
    }
  }

  public async loadProducts(): Promise<void> {
    try {
      this.products = await this.supabaseService.getProducts();
      this.ngZone.run(() => {
        this.cdr.detectChanges();
        if (this.activeAdminTab === 'dashboard') {
          this.updateProductStockChartRealtime();
        }
      });
    } catch (e: any) {
      console.warn('Error cargando productos de Supabase:', e);
    }
  }

  public async loadClients(): Promise<void> {
    try {
      this.customers = await this.supabaseService.getClients();
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      console.warn('Error cargando clientes de Supabase:', e);
    }
  }

  private subscribeToTickets(): void {
    this.ticketsSub = this.ticketService.getTickets().subscribe(tickets => {
      this.tickets = tickets;
      this.ngZone.run(() => {
        this.cdr.detectChanges();
        if (this.activeAdminTab === 'dashboard') {
          this.updateTicketPriorityChartRealtime();
        }
      });
    });
  }

  private subscribeToRealtimeLogs(): void {
    this.logsSub = this.realtimeDoc.logs$.subscribe(logs => {
      this.liveLogs = logs;
      this.cdr.detectChanges();
    });
  }

  private setupRealtimeSubscriptions(): void {
    // 1. Canal Realtime Supabase para cambios en la tabla 'products'
    try {
      const sb = this.supabaseService.client;
      if (sb) {
        this.supabaseChannel = sb
          .channel('public:products:dashboard-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            async () => {
              await this.loadProducts();
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.warn('Supabase realtime channel no inicializado:', err);
    }

    // 2. Polling silencioso de respaldo cada 4 segundos para actualización en vivo garantizada
    this.pollingSub = interval(4000).subscribe(async () => {
      if (this.activeAdminTab === 'dashboard') {
        try {
          const fresh = await this.supabaseService.getProducts();
          if (JSON.stringify(fresh) !== JSON.stringify(this.products)) {
            this.products = fresh;
            this.ngZone.run(() => {
              this.cdr.detectChanges();
              this.updateProductStockChartRealtime();
            });
          }
        } catch {}
      }
    });
  }

  // =================== GRÁFICOS CHART.JS EN TIEMPO REAL ===================

  public initDashboardCharts(): void {
    this.initProductStockChart();
    this.initTicketPriorityChart();
  }

  private initProductStockChart(): void {
    if (!this.productStockCanvasRef?.nativeElement || this.products.length === 0) {
      return;
    }

    if (this.productStockChart) {
      this.productStockChart.destroy();
      this.productStockChart = null;
    }

    const ctxStock = this.productStockCanvasRef.nativeElement.getContext('2d');
    if (!ctxStock) return;

    const labels = this.products.map(p => p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name);
    const stockData = this.products.map(p => p.stock);

    const gradient = ctxStock.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(56, 128, 255, 0.45)');
    gradient.addColorStop(0.7, 'rgba(56, 128, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(56, 128, 255, 0.00)');

    this.productStockChart = new Chart(ctxStock, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cantidad en Stock (uds)',
            data: stockData,
            borderColor: '#3880ff',
            borderWidth: 3,
            fill: true,
            backgroundColor: gradient,
            tension: 0.4,
            pointBackgroundColor: '#3880ff',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 14,
              padding: 8,
              font: { weight: 600 }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => `Stock disponible: ${item.raw} unidades`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { stepSize: 5 }
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 25, minRotation: 0 }
          }
        }
      }
    });
  }

  private updateProductStockChartRealtime(): void {
    if (!this.productStockCanvasRef?.nativeElement) return;
    if (!this.productStockChart) {
      this.initProductStockChart();
      return;
    }

    const labels = this.products.map(p => p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name);
    const stockData = this.products.map(p => p.stock);

    this.productStockChart.data.labels = labels;
    this.productStockChart.data.datasets[0].data = stockData;
    this.productStockChart.update();
  }

  private initTicketPriorityChart(): void {
    if (!this.ticketPriorityCanvasRef?.nativeElement || this.tickets.length === 0) {
      return;
    }

    if (this.ticketPriorityChart) {
      this.ticketPriorityChart.destroy();
      this.ticketPriorityChart = null;
    }

    const ctxTicket = this.ticketPriorityCanvasRef.nativeElement.getContext('2d');
    if (!ctxTicket) return;

    const priorityCounts = [
      this.tickets.filter(t => t.priority === 'urgente').length,
      this.tickets.filter(t => t.priority === 'alta').length,
      this.tickets.filter(t => t.priority === 'media').length,
      this.tickets.filter(t => t.priority === 'baja').length
    ];

    this.ticketPriorityChart = new Chart(ctxTicket, {
      type: 'doughnut',
      data: {
        labels: ['Urgente', 'Alta', 'Media', 'Baja'],
        datasets: [
          {
            data: priorityCounts,
            backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#10b981'],
            borderWidth: 2,
            borderColor: '#1e293b'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 10 }
          }
        },
        cutout: '65%'
      }
    });
  }

  private updateTicketPriorityChartRealtime(): void {
    if (!this.ticketPriorityCanvasRef?.nativeElement) return;
    if (!this.ticketPriorityChart) {
      this.initTicketPriorityChart();
      return;
    }

    const priorityCounts = [
      this.tickets.filter(t => t.priority === 'urgente').length,
      this.tickets.filter(t => t.priority === 'alta').length,
      this.tickets.filter(t => t.priority === 'media').length,
      this.tickets.filter(t => t.priority === 'baja').length
    ];

    this.ticketPriorityChart.data.datasets[0].data = priorityCounts;
    this.ticketPriorityChart.update();
  }

  // =================== ACCIONES DE TICKETS ===================

  public onTicketAction(event: TableActionEvent<Ticket>): void {
    const t = event.row;
    if (event.action === 'toggle-status' || event.action === 'cycle-status') {
      // Rotación secuencial: Abierto -> En Proceso -> Resuelto -> Abierto
      let nextStatus: TicketStatus;
      let toastColor: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'primary';
      let statusLabel = '';

      if (t.status === 'abierto') {
        nextStatus = 'en_proceso';
        toastColor = 'warning';
        statusLabel = 'EN PROCESO';
      } else if (t.status === 'en_proceso') {
        nextStatus = 'resuelto';
        toastColor = 'success';
        statusLabel = 'RESUELTO';
      } else {
        nextStatus = 'abierto';
        toastColor = 'danger';
        statusLabel = 'ABIERTO';
      }

      this.ticketService.updateTicketStatus(t.id, nextStatus).subscribe(() => {
        this.notificationService.showToast(
          `Estado de incidencia ${t.id} cambiado a "${statusLabel}"`,
          toastColor
        );
      });
    } else if (event.action === 'delete') {
      this.deleteTicketRow(t);
    }
  }

  public async deleteTicketRow(ticket: Ticket): Promise<void> {
    const ok = await this.notificationService.showConfirm(
      'Eliminar Incidencia',
      `¿Deseas eliminar permanentemente el ticket ${ticket.id} ("${ticket.reason}")?`
    );
    if (ok) {
      this.ticketService.deleteTicket(ticket.id).subscribe(() => {
        this.notificationService.showToast(`Ticket ${ticket.id} eliminado correctamente`, 'warning');
      });
    }
  }

  public async deleteResolvedTickets(): Promise<void> {
    const resolved = this.tickets.filter(t => t.status === 'resuelto');
    if (resolved.length === 0) {
      this.notificationService.showToast('No hay incidencias en estado "Resuelto" para borrar', 'warning');
      return;
    }
    const ok = await this.notificationService.showConfirm(
      'Borrar Incidencias Resueltas',
      `¿Deseas eliminar permanentemente las ${resolved.length} incidencias marcadas como resueltas?`
    );
    if (ok) {
      resolved.forEach(t => this.ticketService.deleteTicket(t.id).subscribe());
      this.notificationService.showToast(`Se han eliminado ${resolved.length} incidencias resueltas`, 'success');
    }
  }

  public async promptDeleteProduct(): Promise<void> {
    if (this.products.length === 0) {
      this.notificationService.showToast('No hay productos en inventario para borrar', 'warning');
      return;
    }
    const prod = this.products[0];
    const ok = await this.notificationService.showConfirm(
      'Borrado de Producto',
      `¿Deseas eliminar el primer producto del inventario: "${prod.name}"? (O usa el botón Borrar de cualquier fila)`
    );
    if (ok && prod.id) {
      await this.notificationService.showLoading('Eliminando producto de Supabase...');
      try {
        await this.supabaseService.deleteProduct(prod.id);
        await this.notificationService.dismissLoading();
        await this.loadProducts();
        this.notificationService.showToast(`Producto "${prod.name}" eliminado de Supabase`, 'warning');
      } catch (e: any) {
        await this.notificationService.dismissLoading();
        this.notificationService.showToast('Error al eliminar producto: ' + e?.message, 'danger');
      }
    }
  }

  public async promptDeleteClient(): Promise<void> {
    if (this.customers.length === 0) {
      this.notificationService.showToast('No hay clientes registrados para borrar', 'warning');
      return;
    }
    const cl = this.customers[0];
    const ok = await this.notificationService.showConfirm(
      'Borrado de Cliente',
      `¿Deseas eliminar al primer cliente del directorio: "${cl.nombre}" (${cl.empresa})? (O usa el botón Borrar de cualquier fila)`
    );
    if (ok && cl.id) {
      await this.notificationService.showLoading('Eliminando cliente de Supabase...');
      try {
        await this.supabaseService.deleteClient(cl.id);
        await this.notificationService.dismissLoading();
        await this.loadClients();
        this.notificationService.showToast(`Cliente "${cl.nombre}" eliminado de Supabase`, 'warning');
      } catch (e: any) {
        await this.notificationService.dismissLoading();
        this.notificationService.showToast('Error al eliminar cliente: ' + e?.message, 'danger');
      }
    }
  }

  // =================== GESTIÓN DE PRODUCTOS (SUPABASE) ===================

  public selectedProductPhotoFile: File | null = null;

  public onProductPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedProductPhotoFile = input.files[0];
    }
  }

  public openNewProductModal(): void {
    this.selectedProductPhotoFile = null;
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

      // Subida de imagen a Supabase Storage (bucket 'galeria') si se seleccionó archivo
      if (this.selectedProductPhotoFile && added.id) {
        await this.supabaseService.uploadProductPhoto(this.selectedProductPhotoFile, added.id);
        this.selectedProductPhotoFile = null;
      }

      await this.notificationService.dismissLoading();
      this.isProductModalOpen = false;
      await this.loadProducts();

      this.notificationService.showToast(`Producto "${added.name}" guardado en Supabase`, 'success');
      this.realtimeDoc.addLog('Producto Supabase', `Añadido: ${added.name} (Stock: ${added.stock})`, 'success');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error guardando en Supabase: ' + e?.message, 'danger');
    }
  }

  public openEditProductModal(prod: Product): void {
    this.selectedProduct = prod;
    this.selectedProductPhotoFile = null;
    this.editProductForm.patchValue({
      name: prod.name,
      category: prod.category || 'Hardware',
      price: prod.price,
      stock: prod.stock,
      description: prod.description || ''
    });
    this.isEditProductModalOpen = true;
  }

  public async saveEditProduct(): Promise<void> {
    if (this.editProductForm.invalid || !this.selectedProduct?.id) {
      this.editProductForm.markAllAsTouched();
      return;
    }

    const val = this.editProductForm.value;
    await this.notificationService.showLoading('Modificando producto en Supabase...');

    try {
      await this.supabaseService.updateProduct(this.selectedProduct.id, {
        name: val.name,
        category: val.category,
        price: Number(val.price),
        stock: Number(val.stock),
        description: val.description || ''
      });

      // Subida o reemplazo de imagen en el bucket 'galeria' si se seleccionó archivo
      if (this.selectedProductPhotoFile && this.selectedProduct.id) {
        await this.supabaseService.uploadProductPhoto(this.selectedProductPhotoFile, this.selectedProduct.id);
        this.selectedProductPhotoFile = null;
      }

      await this.notificationService.dismissLoading();
      this.isEditProductModalOpen = false;
      await this.loadProducts();

      this.notificationService.showToast(`Producto "${val.name}" modificado con éxito en Supabase`, 'success');
      this.realtimeDoc.addLog('Producto Supabase', `Modificado: ${val.name} (Stock: ${val.stock})`, 'info');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error al modificar en Supabase: ' + e?.message, 'danger');
    }
  }

  public async onProductAction(event: TableActionEvent<Product>): Promise<void> {
    const prod = event.row;
    if (event.action === 'edit') {
      this.openEditProductModal(prod);
    } else if (event.action === 'delete' && prod.id) {
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

  public openEditClientModal(client: any): void {
    this.selectedClient = client;
    this.editClientForm.patchValue({
      nombre: client.nombre,
      empresa: client.empresa,
      email: client.email
    });
    this.isEditClientModalOpen = true;
  }

  public async saveEditClient(): Promise<void> {
    if (this.editClientForm.invalid || !this.selectedClient?.id) {
      this.editClientForm.markAllAsTouched();
      return;
    }

    const val = this.editClientForm.value;
    await this.notificationService.showLoading('Modificando cliente en Supabase...');

    try {
      await this.supabaseService.updateClient(this.selectedClient.id, {
        nombre: val.nombre,
        empresa: val.empresa,
        email: val.email
      });

      await this.notificationService.dismissLoading();
      this.isEditClientModalOpen = false;
      await this.loadClients();

      this.notificationService.showToast(`Cliente "${val.nombre}" modificado con éxito en Supabase`, 'success');
      this.realtimeDoc.addLog('Cliente Supabase', `Modificado: ${val.nombre}`, 'info');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error al modificar en Supabase: ' + e?.message, 'danger');
    }
  }

  public async onClientAction(event: TableActionEvent<any>): Promise<void> {
    const cl = event.row;
    if (event.action === 'edit') {
      this.openEditClientModal(cl);
    } else if (event.action === 'delete' && cl.id) {
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

  // =================== EXPORTACIÓN ===================

  public exportTicketsCsv(): void {
    if (this.tickets.length === 0) {
      this.notificationService.showToast('No hay tickets para exportar a CSV', 'warning');
      return;
    }
    this.exportService.exportToCsv(
      `Tickets_Soporte_${new Date().toISOString().split('T')[0]}`,
      this.tickets,
      [
        { key: 'id', header: 'ID Ticket' },
        { key: 'reason', header: 'Razon / Motivo' },
        { key: 'priority', header: 'Prioridad' },
        { key: 'userName', header: 'Solicitante' },
        { key: 'userEmail', header: 'Email' },
        { key: 'createdAt', header: 'Fecha' },
        { key: 'status', header: 'Estado' }
      ]
    );
    this.notificationService.showToast('Informe CSV de tickets descargado correctamente', 'success');
  }

  public exportTicketsPdf(): void {
    if (this.tickets.length === 0) {
      this.notificationService.showToast('No hay tickets para exportar a PDF', 'warning');
      return;
    }
    this.exportService.exportToPdf({
      title: 'Informe de Incidencias y Tickets de Soporte',
      subtitle: `Registro oficial de solicitudes y estado técnico (${new Date().toLocaleDateString('es-ES')})`,
      filename: `Tickets_Soporte_${new Date().toISOString().split('T')[0]}`,
      kpis: [
        { label: 'Total Tickets', value: String(this.tickets.length) },
        { label: 'Pendientes', value: String(this.openTicketCount) },
        { label: 'Urgentes', value: String(this.urgentTicketCount) },
        { label: 'Resueltos', value: String(this.resolvedTicketCount) }
      ],
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Motivo / Razon', key: 'reason' },
        { header: 'Prioridad', key: 'priority' },
        { header: 'Solicitante', key: 'userName' },
        { header: 'Estado', key: 'status' }
      ],
      rows: this.tickets
    });
    this.notificationService.showToast('Informe PDF de tickets generado y descargado', 'success');
  }

  public exportProductsCsv(): void {
    if (this.products.length === 0) {
      this.notificationService.showToast('No hay productos para exportar a CSV', 'warning');
      return;
    }
    this.exportService.exportToCsv(
      `Productos_Supabase_${new Date().toISOString().split('T')[0]}`,
      this.products,
      [
        { key: 'name', header: 'Nombre' },
        { key: 'category', header: 'Categoria' },
        { key: 'price', header: 'Precio' },
        { key: 'stock', header: 'Cantidad Stock' },
        { key: 'description', header: 'Descripcion' }
      ]
    );
    this.notificationService.showToast('Informe CSV de productos descargado correctamente', 'success');
  }

  public exportProductsPdf(): void {
    if (this.products.length === 0) {
      this.notificationService.showToast('No hay productos para exportar a PDF', 'warning');
      return;
    }
    this.exportService.exportToPdf({
      title: 'Catálogo de Inventario de Productos',
      subtitle: `Existencias y precios sincronizados en Supabase (${new Date().toLocaleDateString('es-ES')})`,
      filename: `Productos_Supabase_${new Date().toISOString().split('T')[0]}`,
      kpis: [
        { label: 'Total Referencias', value: String(this.products.length) },
        { label: 'Stock Acumulado', value: `${this.totalProductStock} uds` }
      ],
      columns: [
        { header: 'Nombre', key: 'name' },
        { header: 'Categoria', key: 'category' },
        { header: 'Precio', key: 'price' },
        { header: 'Stock', key: 'stock' },
        { header: 'Descripcion', key: 'description' }
      ],
      rows: this.products
    });
    this.notificationService.showToast('Informe PDF de productos generado y descargado', 'success');
  }

  public exportClientsCsv(): void {
    if (this.customers.length === 0) {
      this.notificationService.showToast('No hay clientes para exportar a CSV', 'warning');
      return;
    }
    this.exportService.exportToCsv(
      `Clientes_Supabase_${new Date().toISOString().split('T')[0]}`,
      this.customers,
      [
        { key: 'nombre', header: 'Nombre / Contacto' },
        { key: 'empresa', header: 'Empresa / Razon Social' },
        { key: 'email', header: 'Correo Electronico' },
        { key: 'created_at', header: 'Fecha de Alta' }
      ]
    );
    this.notificationService.showToast('Informe CSV de clientes descargado correctamente', 'success');
  }

  public exportClientsPdf(): void {
    if (this.customers.length === 0) {
      this.notificationService.showToast('No hay clientes para exportar a PDF', 'warning');
      return;
    }
    this.exportService.exportToPdf({
      title: 'Directorio Maestro de Clientes',
      subtitle: `Registro de clientes corporativos sincronizados en Supabase (${new Date().toLocaleDateString('es-ES')})`,
      filename: `Clientes_Supabase_${new Date().toISOString().split('T')[0]}`,
      kpis: [
        { label: 'Clientes Registrados', value: String(this.customers.length) }
      ],
      columns: [
        { header: 'Nombre / Contacto', key: 'nombre' },
        { header: 'Empresa / Razon Social', key: 'empresa' },
        { header: 'Correo Electronico', key: 'email' },
        { header: 'Fecha de Alta', key: 'created_at' }
      ],
      rows: this.customers
    });
    this.notificationService.showToast('Informe PDF de clientes generado y descargado', 'success');
  }

  public async openHelpModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }

  ngOnDestroy(): void {
    if (this.ticketsSub) this.ticketsSub.unsubscribe();
    if (this.logsSub) this.logsSub.unsubscribe();
    if (this.pollingSub) this.pollingSub.unsubscribe();
    if (this.supabaseChannel) {
      try {
        this.supabaseService.client?.removeChannel(this.supabaseChannel);
      } catch {}
    }
    if (this.productStockChart) this.productStockChart.destroy();
    if (this.ticketPriorityChart) this.ticketPriorityChart.destroy();
  }
}
