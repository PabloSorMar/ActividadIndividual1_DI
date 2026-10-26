import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Customer, DashboardMetrics, Invoice, InvoiceStatus } from '../models/business.models';

const CUSTOMERS_KEY = 'novagestion_sql_customers';
const INVOICES_KEY = 'novagestion_sql_invoices';

/**
 * Servicio de Consumo Asíncrono de Fuente Relacional (SQL simulado) (RA 5).
 * Simula una API REST sobre base de datos relacional con claves foráneas,
 * operaciones CRUD asíncronas y persistencia local para pruebas.
 */
@Injectable({
  providedIn: 'root'
})
export class SqlDatabaseService {
  private customers: Customer[] = [];
  private invoices: Invoice[] = [];

  constructor() {
    this.seedDatabaseIfEmpty();
  }

  private seedDatabaseIfEmpty(): void {
    const savedCust = localStorage.getItem(CUSTOMERS_KEY);
    const savedInv = localStorage.getItem(INVOICES_KEY);

    if (savedCust && savedInv) {
      try {
        this.customers = JSON.parse(savedCust);
        this.invoices = JSON.parse(savedInv);
        return;
      } catch {
        // En caso de corrupción, reseeding
      }
    }

    // Datos semilla relacionales iniciales
    this.customers = [
      {
        id: 'cust-101',
        name: 'TecnoIberia Soluciones S.A.',
        cif: 'A28901234',
        email: 'contacto@tecnoiberia.es',
        phone: '+34 912 345 678',
        address: 'Paseo de la Castellana 140, Madrid',
        status: 'activo',
        totalSpent: 48950.0,
        createdAt: '2025-11-12'
      },
      {
        id: 'cust-102',
        name: 'Logística Cantábrica S.L.',
        cif: 'B39887766',
        email: 'info@logisticacantabrica.com',
        phone: '+34 942 554 433',
        address: 'Polígono de Candina, Nave 4, Santander',
        status: 'activo',
        totalSpent: 31200.0,
        createdAt: '2025-12-04'
      },
      {
        id: 'cust-103',
        name: 'Biotec Médica Avanzada',
        cif: 'A48112233',
        email: 'compras@biotecmedica.org',
        phone: '+34 944 123 456',
        address: 'Parque Tecnológico de Bizkaia, Edif. 201',
        status: 'activo',
        totalSpent: 87400.0,
        createdAt: '2026-01-15'
      },
      {
        id: 'cust-104',
        name: 'Mediterráneo Retail Group',
        cif: 'B96554433',
        email: 'administracion@medretail.es',
        phone: '+34 963 887 766',
        address: 'Gran Vía Marqués del Turia 45, Valencia',
        status: 'prospecto',
        totalSpent: 4200.0,
        createdAt: '2026-02-01'
      },
      {
        id: 'cust-105',
        name: 'Consultores Innova Madrid',
        cif: 'B82334455',
        email: 'finanzas@innovaconsult.es',
        phone: '+34 915 678 900',
        address: 'Calle Serrano 90, Madrid',
        status: 'inactivo',
        totalSpent: 12500.0,
        createdAt: '2025-09-20'
      }
    ];

    this.invoices = [
      {
        id: 'inv-2026-001',
        invoiceNumber: 'FAC-2026-001',
        customerId: 'cust-101',
        customerName: 'TecnoIberia Soluciones S.A.',
        date: '2026-02-10',
        dueDate: '2026-03-10',
        amount: 14500.0,
        status: 'pagada',
        items: [
          { id: 'it-1', concept: 'Licencia Plataforma Cloud Anual', quantity: 1, unitPrice: 12000.0, total: 12000.0 },
          { id: 'it-2', concept: 'Servicios de Implementación On-Premise', quantity: 25, unitPrice: 100.0, total: 2500.0 }
        ]
      },
      {
        id: 'inv-2026-002',
        invoiceNumber: 'FAC-2026-002',
        customerId: 'cust-103',
        customerName: 'Biotec Médica Avanzada',
        date: '2026-02-18',
        dueDate: '2026-03-18',
        amount: 32600.0,
        status: 'pagada',
        items: [
          { id: 'it-3', concept: 'Desarrollo a Medida Módulo Telemetría', quantity: 1, unitPrice: 32600.0, total: 32600.0 }
        ]
      },
      {
        id: 'inv-2026-003',
        invoiceNumber: 'FAC-2026-003',
        customerId: 'cust-102',
        customerName: 'Logística Cantábrica S.L.',
        date: '2026-03-01',
        dueDate: '2026-03-31',
        amount: 8900.0,
        status: 'pendiente',
        items: [
          { id: 'it-4', concept: 'Soporte 24/7 y Mantenimiento Q1', quantity: 1, unitPrice: 8900.0, total: 8900.0 }
        ]
      },
      {
        id: 'inv-2026-004',
        invoiceNumber: 'FAC-2026-004',
        customerId: 'cust-104',
        customerName: 'Mediterráneo Retail Group',
        date: '2026-03-12',
        dueDate: '2026-04-12',
        amount: 4200.0,
        status: 'pendiente',
        items: [
          { id: 'it-5', concept: 'Consultoría de Seguridad y Auditoría WCAG', quantity: 1, unitPrice: 4200.0, total: 4200.0 }
        ]
      },
      {
        id: 'inv-2026-005',
        invoiceNumber: 'FAC-2026-005',
        customerId: 'cust-105',
        customerName: 'Consultores Innova Madrid',
        date: '2026-01-05',
        dueDate: '2026-02-05',
        amount: 3500.0,
        status: 'vencida',
        items: [
          { id: 'it-6', concept: 'Renovación Certificado SSL Wildcard', quantity: 1, unitPrice: 3500.0, total: 3500.0 }
        ]
      }
    ];

    this.persist();
  }

  private persist(): void {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(this.customers));
    localStorage.setItem(INVOICES_KEY, JSON.stringify(this.invoices));
  }

  // =================== CLIENTES (SQL CRUD) ===================

  public getCustomers(): Observable<Customer[]> {
    return of([...this.customers]).pipe(delay(350));
  }

  public getCustomerById(id: string): Observable<Customer | null> {
    const found = this.customers.find(c => c.id === id) || null;
    return of(found ? { ...found } : null).pipe(delay(250));
  }

  public createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>): Observable<Customer> {
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      totalSpent: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.customers.unshift(newCust);
    this.persist();
    return of(newCust).pipe(delay(400));
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Observable<Customer | null> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return of(null);

    this.customers[index] = { ...this.customers[index], ...updates };
    this.persist();
    return of(this.customers[index]).pipe(delay(350));
  }

  public deleteCustomer(id: string): Observable<boolean> {
    const initialLen = this.customers.length;
    this.customers = this.customers.filter(c => c.id !== id);
    const deleted = this.customers.length < initialLen;
    if (deleted) this.persist();
    return of(deleted).pipe(delay(300));
  }

  // =================== FACTURAS (SQL CRUD) ===================

  public getInvoices(): Observable<Invoice[]> {
    return of([...this.invoices]).pipe(delay(400));
  }

  public createInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Observable<Invoice> {
    const newInv: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: `FAC-2026-${String(this.invoices.length + 1).padStart(3, '0')}`
    };

    this.invoices.unshift(newInv);

    // Actualiza el gasto del cliente asociado (integridad relacional)
    const cust = this.customers.find(c => c.id === newInv.customerId);
    if (cust) {
      cust.totalSpent += newInv.amount;
    }

    this.persist();
    return of(newInv).pipe(delay(450));
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): Observable<Invoice | null> {
    const inv = this.invoices.find(i => i.id === id);
    if (!inv) return of(null);

    inv.status = status;
    this.persist();
    return of({ ...inv }).pipe(delay(300));
  }

  // =================== MÉTRICAS CONSOLIDADAS ===================

  public getDashboardMetrics(timeRange: 'all' | 'year' | 'month' = 'all'): Observable<DashboardMetrics> {
    return of(null).pipe(
      delay(450),
      map(() => {
        const totalRevenue = this.invoices
          .filter(i => i.status === 'pagada')
          .reduce((acc, curr) => acc + curr.amount, 0);

        const pendingList = this.invoices.filter(i => i.status === 'pendiente' || i.status === 'vencida');
        const pendingInvoicesAmount = pendingList.reduce((acc, curr) => acc + curr.amount, 0);

        const activeCustomers = this.customers.filter(c => c.status === 'activo').length;

        const monthlyRevenue = [
          { month: 'Ene', amount: 35000, target: 30000 },
          { month: 'Feb', amount: 47100, target: 40000 },
          { month: 'Mar', amount: 52400, target: 45000 },
          { month: 'Abr', amount: 48900, target: 45000 },
          { month: 'May', amount: 61200, target: 50000 },
          { month: 'Jun', amount: 68500, target: 55000 }
        ];

        const statuses: InvoiceStatus[] = ['pagada', 'pendiente', 'vencida', 'anulada'];
        const invoicesByStatus = statuses.map(st => {
          const matched = this.invoices.filter(i => i.status === st);
          return {
            status: st,
            count: matched.length,
            total: matched.reduce((sum, item) => sum + item.amount, 0)
          };
        });

        return {
          totalRevenue,
          revenueTrend: 18.4,
          activeCustomers,
          customersTrend: 12.0,
          pendingInvoices: pendingList.length,
          pendingInvoicesAmount,
          satisfactionRate: 98.2,
          monthlyRevenue,
          invoicesByStatus
        };
      })
    );
  }
}
