import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Ticket, TicketPriority, TicketStatus } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { RealtimeDocService } from './realtime-doc.service';

const TICKETS_STORAGE_KEY = 'cliegestion_tickets_store';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private authService = inject(AuthService);
  private realtimeDoc = inject(RealtimeDocService);

  private readonly initialTickets: Ticket[] = [
    {
      id: 'TCK-2026-001',
      userId: '6bd3c4d8-3a80-4e90-b438-a9abe02550a9',
      userEmail: 'user@gmail.com',
      userName: 'Usuario Demo',
      reason: 'Fallo de sincronización en stock de servidor Rack',
      priority: 'urgente',
      description: 'El inventario muestra 5 unidades pero en el almacén físico quedan 3.',
      status: 'abierto',
      createdAt: '2026-10-27 09:15'
    },
    {
      id: 'TCK-2026-002',
      userId: '6bd3c4d8-3a80-4e90-b438-a9abe02550a9',
      userEmail: 'user@gmail.com',
      userName: 'Usuario Demo',
      reason: 'Solicitud de ampliación de licencia para router Cisco',
      priority: 'media',
      description: 'Necesitamos habilitar 8 puertos adicionales en el rack secundario.',
      status: 'en_proceso',
      createdAt: '2026-10-26 16:30'
    },
    {
      id: 'TCK-2026-003',
      userId: 'usr-client-03',
      userEmail: 'cliente@telefonicatech.com',
      userName: 'Marta Soler',
      reason: 'Error al generar informe PDF de facturación',
      priority: 'alta',
      description: 'La exportación mensual arroja timeout en navegadores Firefox.',
      status: 'abierto',
      createdAt: '2026-10-27 11:45'
    },
    {
      id: 'TCK-2026-004',
      userId: 'usr-client-04',
      userEmail: 'soporte@iberdrola.com',
      userName: 'Javier Navarro',
      reason: 'Consulta sobre compatibilidad de SAI APC Smart-UPS',
      priority: 'baja',
      description: 'Duda acerca del voltaje admitido en instalaciones monofásicas.',
      status: 'resuelto',
      createdAt: '2026-10-25 14:10'
    }
  ];

  private ticketsSubject$ = new BehaviorSubject<Ticket[]>([]);
  public readonly tickets$: Observable<Ticket[]> = this.ticketsSubject$.asObservable();

  constructor() {
    this.loadTickets();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === TICKETS_STORAGE_KEY) {
          this.loadTickets();
        }
      });
    }
  }

  private loadTickets(): void {
    const saved = localStorage.getItem(TICKETS_STORAGE_KEY) || localStorage.getItem('novagestion_tickets_store');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.ticketsSubject$.next(parsed);
          return;
        }
      } catch {
        // Fallback a iniciales
      }
    }
    this.ticketsSubject$.next([...this.initialTickets]);
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(this.ticketsSubject$.value));
    localStorage.setItem('novagestion_tickets_store', JSON.stringify(this.ticketsSubject$.value));
  }

  /**
   * Obtiene todos los tickets (para el Administrador)
   */
  public getTickets(): Observable<Ticket[]> {
    return this.tickets$;
  }

  /**
   * Obtiene los tickets creados por un usuario específico (para el rol User)
   */
  public getUserTickets(userEmail: string): Observable<Ticket[]> {
    const normalized = userEmail.trim().toLowerCase();
    return this.tickets$.pipe(
      map(list => list.filter(t => t.userEmail.toLowerCase() === normalized))
    );
  }

  /**
   * Crea un nuevo ticket
   */
  public createTicket(data: { reason: string; priority: TicketPriority; description?: string }): Observable<Ticket> {
    const currentUser = this.authService.getCurrentUser();
    const newId = `TCK-2026-${String(this.ticketsSubject$.value.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTicket: Ticket = {
      id: newId,
      userId: currentUser?.id,
      userEmail: currentUser?.email || 'user@gmail.com',
      userName: currentUser?.name || 'Usuario',
      reason: data.reason.trim(),
      priority: data.priority,
      description: data.description?.trim() || '',
      status: 'abierto',
      createdAt: formattedDate
    };

    const updated = [newTicket, ...this.ticketsSubject$.value];
    this.ticketsSubject$.next(updated);
    this.persist();

    this.realtimeDoc.addLog(
      'Ticket Creado',
      `[${data.priority.toUpperCase()}] ${data.reason}`,
      data.priority === 'urgente' || data.priority === 'alta' ? 'warning' : 'info',
      newTicket.userName,
      'user'
    );

    return of(newTicket);
  }

  /**
   * Actualiza el estado de un ticket (abierto / en_proceso / resuelto)
   */
  public updateTicketStatus(id: string, status: TicketStatus): Observable<Ticket | null> {
    const list = this.ticketsSubject$.value;
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return of(null);

    const updatedTicket: Ticket = {
      ...list[index],
      status
    };

    const nextList = [...list];
    nextList[index] = updatedTicket;
    this.ticketsSubject$.next(nextList);
    this.persist();

    this.realtimeDoc.addLog(
      'Estado Ticket Actualizado',
      `${id} -> ${status.toUpperCase()}`,
      status === 'resuelto' ? 'success' : 'info',
      this.authService.getCurrentUser()?.name || 'Admin',
      'admin'
    );

    return of(updatedTicket);
  }

  /**
   * Elimina un ticket
   */
  public deleteTicket(id: string): Observable<boolean> {
    const nextList = this.ticketsSubject$.value.filter(t => t.id !== id);
    this.ticketsSubject$.next(nextList);
    this.persist();
    return of(true);
  }
}
