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
export class AdminDashboardPage implements OnInit, AfterViewInit, OnDestroy {
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

  // Pestañas principales requeridas: Centro de Mando y Gestión (Clientes / Productos)
  public activeAdminTab: 'dashboard' | 'management' = 'dashboard';
  public managementSubTab: 'products' | 'clients' = 'products';

  public isLoading: boolean = true;

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
    { id: 'edit', label: 'Modificar Producto', icon: 'create-outline', color: 'primary' },
    { id: 'delete', label: 'Eliminar de Supabase', icon: 'trash-outline', color: 'danger' }
  ];

  // 3. Tabla de Clientes (Gestión)
  public customerColumns: TableColumn<any>[] = [
    { key: 'nombre', header: 'Nombre / Contacto', sortable: true },
    { key: 'empresa', header: 'Empresa / Razón Social', sortable: true },
    { key: 'email', header: 'Correo Electrónico', sortable: true },
    { key: 'created_at', header: 'Fecha de Alta', sortable: true, type: 'date', width: '130px' }
  ];

  public customerActions: TableAction<any>[] = [
    { id: 'edit', label: 'Modificar Cliente', icon: 'create-outline', color: 'primary' },
    { id: 'delete', label: 'Eliminar de Supabase', icon: 'trash-outline', color: 'danger' }
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
  }

  ngAfterViewInit(): void {
    if (!this.isLoading && this.activeAdminTab === 'dashboard') {
      this.initDashboardCharts();
    }
  }

  public onTabChange(tab: any): void {
    this.activeAdminTab = tab;
    if (tab === 'dashboard') {
      setTimeout(() => this.initDashboardCharts(), 100);
    } else {
      this.loadProducts();
      this.loadClients();
    }
  }

  public onManagementSubTabChange(subTab: any): void {
    this.managementSubTab = subTab;
    if (subTab === 'products') {
      this.loadProducts();
    } else {
      this.loadClients();
    }
  }

  public async loadAllData(): Promise<void> {
    this.isLoading = true;
    try {
      await Promise.all([this.loadProducts(), this.loadClients()]);
    } finally {
      this.isLoading = false;
      if (this.activeAdminTab === 'dashboard') {
        setTimeout(() => this.initDashboardCharts(), 100);
      }
    }
  }

  public async loadProducts(): Promise<void> {
    try {
      this.products = await this.supabaseService.getProducts();
    } catch (e: any) {
      console.warn('Error cargando productos de Supabase:', e);
    }
  }

  public async loadClients(): Promise<void> {
    try {
      this.customers = await this.supabaseService.getClients();
    } catch (e: any) {
      console.warn('Error cargando clientes de Supabase:', e);
    }
  }

  private subscribeToTickets(): void {
    this.ticketsSub = this.ticketService.getTickets().subscribe(tickets => {
      this.tickets = tickets;
      if (this.activeAdminTab === 'dashboard') {
        setTimeout(() => this.initDashboardCharts(), 100);
      }
    });
  }

  private subscribeToRealtimeLogs(): void {
    this.logsSub = this.realtimeDoc.logs$.subscribe(logs => {
      this.liveLogs = logs;
    });
  }

  // =================== GRÁFICOS CHART.JS ===================

  private initDashboardCharts(): void {
    // 1. Gráfico de Distribución de Productos en Cantidad
    if (this.productStockCanvasRef?.nativeElement && this.products.length > 0) {
      if (this.productStockChart) {
        this.productStockChart.destroy();
      }

      const ctxStock = this.productStockCanvasRef.nativeElement.getContext('2d');
      if (ctxStock) {
        const labels = this.products.map(p => p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name);
        const stockData = this.products.map(p => p.stock);
        const colors = [
          'rgba(56, 128, 255, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(6, 182, 212, 0.85)',
          'rgba(239, 68, 68, 0.85)'
        ];

        // Crear gradiente estilizado para el área
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
    }

    // 2. Gráfico de Tickets por Prioridad
    if (this.ticketPriorityCanvasRef?.nativeElement && this.tickets.length > 0) {
      if (this.ticketPriorityChart) {
        this.ticketPriorityChart.destroy();
      }

      const ctxTicket = this.ticketPriorityCanvasRef.nativeElement.getContext('2d');
      if (ctxTicket) {
        const priorityCounts = {
          Urgente: this.tickets.filter(t => t.priority === 'urgente').length,
          Alta: this.tickets.filter(t => t.priority === 'alta').length,
          Media: this.tickets.filter(t => t.priority === 'media').length,
          Baja: this.tickets.filter(t => t.priority === 'baja').length
        };

        this.ticketPriorityChart = new Chart(ctxTicket, {
          type: 'doughnut',
          data: {
            labels: Object.keys(priorityCounts),
            datasets: [
              {
                data: Object.values(priorityCounts),
                backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#10b981'],
                borderWidth: 2,
                borderColor: '#1e293b'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
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
    }
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
    }
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
      this.realtimeDoc.addLog('Producto Supabase', `Añadido: ${added.name} (Stock: ${added.stock})`, 'success');
    } catch (e: any) {
      await this.notificationService.dismissLoading();
      this.notificationService.showToast('Error guardando en Supabase: ' + e?.message, 'danger');
    }
  }

  public openEditProductModal(prod: Product): void {
    this.selectedProduct = prod;
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

  public exportProductsCsv(): void {
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

  public async openHelpModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }

  ngOnDestroy(): void {
    if (this.ticketsSub) this.ticketsSub.unsubscribe();
    if (this.logsSub) this.logsSub.unsubscribe();
    if (this.productStockChart) this.productStockChart.destroy();
    if (this.ticketPriorityChart) this.ticketPriorityChart.destroy();
  }
}
