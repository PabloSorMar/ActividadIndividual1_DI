/**
 * Modelo de datos para Tickets de Soporte / Incidencias de Usuario.
 */
export type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto';

export interface Ticket {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  reason: string;           // Razón o Motivo del ticket
  priority: TicketPriority; // Prioridad ('baja' | 'media' | 'alta' | 'urgente')
  description?: string;     // Detalles adicionales opcionales
  status: TicketStatus;     // Estado del ticket
  createdAt: string;        // Fecha de creación
}
