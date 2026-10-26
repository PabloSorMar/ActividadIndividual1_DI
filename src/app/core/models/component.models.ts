/**
 * Modelos para componentes visuales agnósticos y reutilizables (RA 3).
 */

export interface TableColumn<T = any> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'currency' | 'badge' | 'date';
  badgeColorMap?: Record<string, string>;
  align?: 'left' | 'center' | 'right';
  width?: string;
  formatter?: (value: any, row: T) => string;
}

export interface TableAction<T = any> {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  condition?: (row: T) => boolean;
}

export interface TableActionEvent<T = any> {
  action: string;
  row: T;
}

export interface StatCardData {
  id?: string;
  title: string;
  value: string | number;
  icon: string;
  trend?: number; // e.g. +14.2 o -3.5
  trendLabel?: string;
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger';
  prefix?: string;
  suffix?: string;
  description?: string;
}
