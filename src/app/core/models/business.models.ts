/**
 * Modelos de negocio para simulación dual de orígenes de datos:
 * - SQL (Relacional): Clientes, Facturas, Artículos (claves foráneas)
 * - NoSQL (Documental en tiempo real): Eventos, Logs de auditoría, Métricas
 */

export type CustomerStatus = 'activo' | 'inactivo' | 'prospecto';
export type InvoiceStatus = 'pagada' | 'pendiente' | 'vencida' | 'anulada';
export type LogSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface Customer {
  id: string;
  name: string;
  cif: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  totalSpent: number;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  concept: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userName: string;
  userRole: string;
  severity: LogSeverity;
  details: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueTrend: number;
  activeCustomers: number;
  customersTrend: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  satisfactionRate: number;
  monthlyRevenue: { month: string; amount: number; target: number }[];
  invoicesByStatus: { status: InvoiceStatus; count: number; total: number }[];
}
