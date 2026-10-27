import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Customer, DashboardMetrics, Invoice, InvoiceStatus } from '../models/business.models';
import { SupabaseService } from './supabase.service';

const CUSTOMERS_KEY = 'novagestion_sql_customers';
const INVOICES_KEY = 'novagestion_sql_invoices';

/**
 * Servicio de Consumo Asíncrono de Fuente Relacional y Supabase (RA 5).
 * Conecta directamente los clientes con la tabla 'clients' de Supabase
 * eliminando cualquier dato semilla o ejemplo local.
 */
@Injectable({
  providedIn: 'root'
})
export class SqlDatabaseService {
  private customers: Customer[] = [];
  private invoices: Invoice[] = [];

  constructor(private supabaseService: SupabaseService) {
    this.seedDatabaseIfEmpty();
  }

  private seedDatabaseIfEmpty(): void {
    // Limpiamos cualquier caché con clientes de ejemplo previos
    localStorage.removeItem(CUSTOMERS_KEY);
    this.customers = [];

    const savedInv = localStorage.getItem(INVOICES_KEY);
    if (savedInv) {
      try {
        this.invoices = JSON.parse(savedInv);
        return;
      } catch {
        // En caso de corrupción, reseeding
      }
    }

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

  // =================== CLIENTES (SUPABASE REAL-TIME) ===================

  public getCustomers(): Observable<Customer[]> {
    return from(this.supabaseService.getClients()).pipe(
      map(supaClients => supaClients.map((c: any) => ({
        id: c.id,
        name: c.nombre || c.name || 'Cliente Supabase',
        cif: c.cif || 'B00000000',
        email: c.email || '',
        phone: c.phone || '',
        address: c.empresa || '',
        status: 'activo' as const,
        totalSpent: 0,
        createdAt: c.created_at || new Date().toISOString()
      }))),
      tap(custs => {
        this.customers = custs;
      })
    );
  }

  public getCustomerById(id: string): Observable<Customer | null> {
    const found = this.customers.find(c => c.id === id) || null;
    return of(found ? { ...found } : null).pipe(delay(100));
  }

  public createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>): Observable<Customer> {
    return from(this.supabaseService.addClient({
      nombre: customer.name,
      empresa: customer.address || customer.name,
      email: customer.email
    })).pipe(
      map((res: any) => ({
        ...customer,
        id: res.id,
        totalSpent: 0,
        createdAt: res.created_at || new Date().toISOString()
      })),
      tap(newCust => {
        this.customers.unshift(newCust);
      })
    );
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Observable<Customer | null> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return of(null);

    this.customers[index] = { ...this.customers[index], ...updates };
    this.persist();
    return of(this.customers[index]).pipe(delay(200));
  }

  public deleteCustomer(id: string): Observable<boolean> {
    return from(this.supabaseService.deleteClient(id)).pipe(
      tap(() => {
        this.customers = this.customers.filter(c => c.id !== id);
      }),
      map(() => true)
    );
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
