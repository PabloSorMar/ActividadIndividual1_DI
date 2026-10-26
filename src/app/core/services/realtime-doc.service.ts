import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { AuditLog, LogSeverity, SystemNotification } from '../models/business.models';

/**
 * Servicio de Consumo de Datos en Tiempo Real basado en Documentos (NoSQL / Firestore simulado) (RA 5).
 * Emite streams reactivos en vivo de auditoría y eventos sin recarga de página.
 */
@Injectable({
  providedIn: 'root'
})
export class RealtimeDocService implements OnDestroy {
  private initialLogs: AuditLog[] = [
    {
      id: 'doc-log-01',
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('es-ES'),
      action: 'Inicio de Sesión',
      userName: 'Carlos Mendoza',
      userRole: 'admin',
      severity: 'info',
      details: 'Autenticación exitosa desde IP 192.168.1.45'
    },
    {
      id: 'doc-log-02',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toLocaleTimeString('es-ES'),
      action: 'Factura Emitida',
      userName: 'Carlos Mendoza',
      userRole: 'admin',
      severity: 'success',
      details: 'Generada FAC-2026-004 para Mediterráneo Retail Group'
    },
    {
      id: 'doc-log-03',
      timestamp: new Date(Date.now() - 3600000 * 0.8).toLocaleTimeString('es-ES'),
      action: 'Alerta de Vencimiento',
      userName: 'Sistema Automatizado',
      userRole: 'system',
      severity: 'warning',
      details: 'Factura FAC-2026-005 ha superado la fecha límite de pago'
    }
  ];

  private logsSubject$ = new BehaviorSubject<AuditLog[]>(this.initialLogs);
  public readonly logs$: Observable<AuditLog[]> = this.logsSubject$.asObservable();

  private notificationsSubject$ = new BehaviorSubject<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'Copia de seguridad completada',
      message: 'La réplica de datos Firestore se ha sincronizado correctamente.',
      timestamp: 'Hace 10 min',
      read: false,
      type: 'success'
    },
    {
      id: 'notif-2',
      title: 'Factura pendiente de cobro',
      message: 'Logística Cantábrica S.L. tiene una factura que vence en 5 días.',
      timestamp: 'Hace 45 min',
      read: false,
      type: 'warning'
    }
  ]);
  public readonly notifications$: Observable<SystemNotification[]> = this.notificationsSubject$.asObservable();

  private liveSubscription?: Subscription;

  constructor() {
    this.startLiveSimulation();
  }

  /**
   * Simula eventos entrantes en tiempo real mediante websocket o snapshot listeners
   */
  private startLiveSimulation(): void {
    // Cada 45 segundos simula un evento push de documento
    const simulatedEvents = [
      { action: 'Sincronización Cloud', details: 'Verificación de integridad de réplica completada', severity: 'info' as LogSeverity },
      { action: 'Consulta de Informe', details: 'Exportación de métricas solicitada', severity: 'info' as LogSeverity },
      { action: 'Monitor de Salud', details: 'Todos los microservicios operando con latencia < 35ms', severity: 'success' as LogSeverity }
    ];

    let index = 0;
    this.liveSubscription = interval(45000).subscribe(() => {
      const evt = simulatedEvents[index % simulatedEvents.length];
      this.addLog(evt.action, evt.details, evt.severity, 'Sistema Cloud', 'system');
      index++;
    });
  }

  public addLog(
    action: string,
    details: string,
    severity: LogSeverity = 'info',
    userName: string = 'Usuario Activo',
    userRole: string = 'user'
  ): void {
    const newLog: AuditLog = {
      id: `doc-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-ES'),
      action,
      details,
      severity,
      userName,
      userRole
    };

    const current = this.logsSubject$.value;
    this.logsSubject$.next([newLog, ...current.slice(0, 24)]); // Mantiene los últimos 25 eventos
  }

  public clearLogs(): void {
    this.logsSubject$.next([]);
  }

  ngOnDestroy(): void {
    if (this.liveSubscription) {
      this.liveSubscription.unsubscribe();
    }
  }
}
