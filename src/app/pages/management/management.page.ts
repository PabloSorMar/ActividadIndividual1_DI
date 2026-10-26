import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonIcon,
  IonModal,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonBadge
} from '@ionic/angular';
import { SqlDatabaseService } from '../../core/services/sql-database.service';
import { RealtimeDocService } from '../../core/services/realtime-doc.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { NotificationService } from '../../core/services/notification.service';
import { Customer, CustomerStatus, Invoice, InvoiceStatus } from '../../core/models/business.models';
import { TableAction, TableActionEvent, TableColumn } from '../../core/models/component.models';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';

/**
 * Vista de Gestión de Datos Relacionales (SQL CRUD completo) (RA 3 y RA 5).
 * Permite la administración integral de Clientes y Facturas con claves foráneas.
 */
@Component({
  selector: 'app-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonIcon,
    IonModal,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButtons,
    IonBadge,
    DataTableComponent
  ],
  templateUrl: './management.page.html',
  styleUrls: ['./management.page.scss']
})
export class ManagementPage implements OnInit {
  private sqlDb = inject(SqlDatabaseService);
  private realtimeDoc = inject(RealtimeDocService);
  private exportService = inject(ReportExportService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  public activeTab: 'customers' | 'invoices' = 'customers';
  public customers: Customer[] = [];
  public invoices: Invoice[] = [];
  public isLoading: boolean = true;

  // Modales
  public isCustomerModalOpen: boolean = false;
  public isInvoiceModalOpen: boolean = false;

  // Formularios
  public customerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    cif: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    address: ['', [Validators.required]],
    status: ['activo' as CustomerStatus, [Validators.required]]
  });

  public invoiceForm: FormGroup = this.fb.group({
    customerId: ['', [Validators.required]],
    concept: ['', [Validators.required, Validators.minLength(3)]],
    amount: [1000, [Validators.required, Validators.min(1)]],
    dueDate: ['', [Validators.required]],
    status: ['pendiente' as InvoiceStatus, [Validators.required]]
  });

  // Columnas para Clientes
  public customerColumns: TableColumn<Customer>[] = [
    { key: 'name', header: 'Razón Social / Cliente', sortable: true },
    { key: 'cif', header: 'CIF / NIF', sortable: true, width: '120px' },
    { key: 'email', header: 'Email de Contacto', sortable: true },
    { key: 'phone', header: 'Teléfono', width: '130px' },
    { key: 'totalSpent', header: 'Gasto Acumulado', sortable: true, type: 'currency', align: 'right', width: '140px' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      type: 'badge',
      align: 'center',
      width: '110px',
      badgeColorMap: {
        activo: 'success',
        prospecto: 'secondary',
        inactivo: 'medium'
      }
    }
  ];

  public customerActions: TableAction<Customer>[] = [
    { id: 'edit', label: 'Editar Cliente', icon: 'create-outline', color: 'primary' },
    { id: 'delete', label: 'Eliminar', icon: 'trash-outline', color: 'danger' }
  ];

  // Columnas para Facturas
  public invoiceColumns: TableColumn<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Nº Factura', sortable: true, width: '140px' },
    { key: 'customerName', header: 'Cliente', sortable: true },
    { key: 'date', header: 'Emisión', sortable: true, type: 'date', width: '110px' },
    { key: 'dueDate', header: 'Vencimiento', sortable: true, type: 'date', width: '110px' },
    { key: 'amount', header: 'Total Factura', sortable: true, type: 'currency', align: 'right', width: '130px' },
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
    { id: 'toggle-status', label: 'Cambiar Estado', icon: 'swap-horizontal-outline', color: 'secondary' }
  ];

  ngOnInit(): void {
    this.refreshAll();
  }

  public refreshAll(): void {
    this.isLoading = true;
    this.sqlDb.getCustomers().subscribe(c => {
      this.customers = c;
      this.sqlDb.getInvoices().subscribe(i => {
        this.invoices = i;
        this.isLoading = false;
      });
    });
  }

  public openNewCustomerModal(): void {
    this.customerForm.reset({ status: 'activo' });
    this.isCustomerModalOpen = true;
  }

  public saveCustomer(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const val = this.customerForm.value;
    this.sqlDb.createCustomer(val).subscribe(newC => {
      this.isCustomerModalOpen = false;
      this.refreshAll();
      this.notification.showToast(`Cliente ${newC.name} registrado con éxito`, 'success');
      this.realtimeDoc.addLog('Cliente Creado', `Alta de ${newC.name} (${newC.cif})`, 'success');
    });
  }

  public onCustomerAction(event: TableActionEvent<Customer>): void {
    const cust = event.row;
    if (event.action === 'edit') {
      this.notification.showAlert('Editar Cliente', `Edición de datos para ${cust.name} (${cust.cif})`);
    } else if (event.action === 'delete') {
      this.notification.showConfirm('Confirmar Eliminación', `¿Estás seguro de eliminar a ${cust.name}?`).then(ok => {
        if (ok) {
          this.sqlDb.deleteCustomer(cust.id).subscribe(() => {
            this.refreshAll();
            this.notification.showToast(`Cliente ${cust.name} eliminado`, 'warning');
            this.realtimeDoc.addLog('Cliente Eliminado', `Baja de ${cust.name}`, 'danger');
          });
        }
      });
    }
  }

  public openNewInvoiceModal(): void {
    const defaultDue = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    this.invoiceForm.reset({
      customerId: this.customers[0]?.id || '',
      concept: '',
      amount: 1500,
      dueDate: defaultDue,
      status: 'pendiente'
    });
    this.isInvoiceModalOpen = true;
  }

  public saveInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    const val = this.invoiceForm.value;
    const customer = this.customers.find(c => c.id === val.customerId);

    this.sqlDb.createInvoice({
      customerId: val.customerId,
      customerName: customer ? customer.name : 'Cliente General',
      date: new Date().toISOString().split('T')[0],
      dueDate: val.dueDate,
      amount: Number(val.amount),
      status: val.status,
      items: [
        {
          id: `it-${Date.now()}`,
          concept: val.concept,
          quantity: 1,
          unitPrice: Number(val.amount),
          total: Number(val.amount)
        }
      ]
    }).subscribe(newInv => {
      this.isInvoiceModalOpen = false;
      this.refreshAll();
      this.notification.showToast(`Factura ${newInv.invoiceNumber} emitida`, 'success');
      this.realtimeDoc.addLog('Factura Emitida', `${newInv.invoiceNumber} a ${newInv.customerName}`, 'info');
    });
  }

  public onInvoiceAction(event: TableActionEvent<Invoice>): void {
    const inv = event.row;
    if (event.action === 'toggle-status') {
      const nextStatus = inv.status === 'pagada' ? 'pendiente' : 'pagada';
      this.sqlDb.updateInvoiceStatus(inv.id, nextStatus).subscribe(() => {
        inv.status = nextStatus;
        this.notification.showToast(`Factura ${inv.invoiceNumber} actualizada a ${nextStatus.toUpperCase()}`, 'primary');
      });
    }
  }

  public exportActiveViewPdf(): void {
    if (this.activeTab === 'customers') {
      this.exportService.exportToPdf({
        title: 'Listado Maestro de Clientes Corporativos',
        subtitle: `Total registrados: ${this.customers.length}`,
        filename: `Clientes_NovaGestion_${Date.now()}`,
        columns: [
          { header: 'Cliente / Empresa', key: 'name' },
          { header: 'CIF/NIF', key: 'cif' },
          { header: 'Email', key: 'email' },
          { header: 'Teléfono', key: 'phone' },
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
      this.exportService.exportToPdf({
        title: 'Listado Detallado de Facturas',
        subtitle: `Total facturas: ${this.invoices.length}`,
        filename: `Facturas_NovaGestion_${Date.now()}`,
        columns: [
          { header: 'Nº Factura', key: 'invoiceNumber' },
          { header: 'Cliente', key: 'customerName' },
          { header: 'Emisión', key: 'date' },
          { header: 'Vencimiento', key: 'dueDate' },
          { header: 'Importe', key: 'amount' },
          { header: 'Estado', key: 'status' }
        ],
        rows: this.invoices.map(i => ({
          ...i,
          amount: `${i.amount.toLocaleString('es-ES')} €`,
          status: i.status.toUpperCase()
        }))
      });
    }
    this.notification.showToast('Informe exportado a PDF correctamente', 'success');
  }

  public exportActiveViewCsv(): void {
    if (this.activeTab === 'customers') {
      this.exportService.exportToCsv('Clientes_NovaGestion', this.customers, [
        { key: 'name', header: 'Nombre' },
        { key: 'cif', header: 'CIF' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Telefono' },
        { key: 'address', header: 'Direccion' },
        { key: 'totalSpent', header: 'TotalGastado' },
        { key: 'status', header: 'Estado' }
      ]);
    } else {
      this.exportService.exportToCsv('Facturas_NovaGestion', this.invoices, [
        { key: 'invoiceNumber', header: 'NumeroFactura' },
        { key: 'customerName', header: 'Cliente' },
        { key: 'date', header: 'Fecha' },
        { key: 'dueDate', header: 'Vencimiento' },
        { key: 'amount', header: 'Importe' },
        { key: 'status', header: 'Estado' }
      ]);
    }
    this.notification.showToast('Archivo CSV generado y descargado', 'success');
  }
}
