import { ChangeDetectorRef, Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonSearchbar,
  ModalController,
  ViewWillEnter
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TicketService } from '../../core/services/ticket.service';
import { Product } from '../../core/models/product.model';
import { Ticket, TicketPriority } from '../../core/models/ticket.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { HelpModalComponent } from '../../shared/components/help-modal/help-modal.component';

/**
 * Portal del Usuario Estándar:
 * - Visualización del catálogo de productos disponibles en el sistema.
 * - Creación de tickets de soporte con motivo/razón y prioridad (baja, media, alta, urgente).
 * - Seguimiento de tickets propios ("Mis Tickets").
 */
@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonSearchbar,
    StatCardComponent
  ],
  templateUrl: './user-dashboard.page.html',
  styleUrls: ['./user-dashboard.page.scss']
})
export class UserDashboardPage implements OnInit, OnDestroy, ViewWillEnter {
  public authService = inject(AuthService);
  private notification = inject(NotificationService);
  public supabaseService = inject(SupabaseService);
  public ticketService = inject(TicketService);
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  public isLoadingProducts: boolean = false;
  public products: Product[] = [];
  public productSearchQuery: string = '';

  public myTickets: Ticket[] = [];
  public isSubmittingTicket: boolean = false;

  private ticketsSub?: Subscription;
  private supabaseChannel?: any;

  // Formulario para Crear Ticket (Requerimiento: Motivo y Prioridad)
  public ticketForm: FormGroup = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(4)]],
    priority: ['media' as TicketPriority, [Validators.required]],
    description: ['']
  });

  public get filteredProducts(): Product[] {
    if (!this.productSearchQuery.trim()) {
      return this.products;
    }
    const q = this.productSearchQuery.toLowerCase().trim();
    return this.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this.loadProducts();
    this.subscribeToMyTickets();
    this.setupRealtimeProducts();
  }

  ionViewWillEnter(): void {
    // Garantiza recarga y renderizado inmediato cada vez que el usuario navega a la vista
    this.loadProducts();
    this.subscribeToMyTickets();
  }

  public async loadProducts(): Promise<void> {
    // Si ya hay productos cargados en memoria, evitamos el parpadeo de pantalla vacía
    if (this.products.length === 0) {
      this.isLoadingProducts = true;
      this.cdr.detectChanges();
    }

    // Temporizador de seguridad para evitar que la vista quede en carga indefinida ante latencias de red
    const safetyTimer = setTimeout(() => {
      if (this.isLoadingProducts) {
        this.ngZone.run(() => {
          this.isLoadingProducts = false;
          this.cdr.detectChanges();
        });
      }
    }, 3500);

    try {
      const prods = await this.supabaseService.getProducts();
      this.ngZone.run(() => {
        clearTimeout(safetyTimer);
        this.products = prods;
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      console.warn('Error cargando productos:', e);
      this.ngZone.run(() => {
        clearTimeout(safetyTimer);
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
      this.notification.showToast('Error al conectar con catálogo de productos', 'danger');
    } finally {
      this.ngZone.run(() => {
        clearTimeout(safetyTimer);
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
    }
  }

  private setupRealtimeProducts(): void {
    try {
      const sb = this.supabaseService.client;
      if (sb) {
        this.supabaseChannel = sb
          .channel('public:products:user-dashboard')
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
      console.warn('Error conectando realtime products en user dashboard:', err);
    }
  }

  private subscribeToMyTickets(): void {
    if (this.ticketsSub) {
      this.ticketsSub.unsubscribe();
    }

    const currentUser = this.authService.getCurrentUser();
    const userEmail = currentUser?.email || 'user@gmail.com';

    this.ticketsSub = this.ticketService.getUserTickets(userEmail).subscribe(list => {
      this.ngZone.run(() => {
        this.myTickets = list;
        this.cdr.detectChanges();
      });
    });
  }

  public submitTicket(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      this.notification.showToast('Por favor, indica el motivo y la prioridad del ticket', 'warning');
      return;
    }

    this.isSubmittingTicket = true;
    const { reason, priority, description } = this.ticketForm.value;

    this.ticketService.createTicket({ reason, priority, description }).subscribe({
      next: (newTicket) => {
        this.ngZone.run(() => {
          this.isSubmittingTicket = false;
          this.ticketForm.reset({
            reason: '',
            priority: 'media',
            description: ''
          });
          this.cdr.detectChanges();
        });
        this.notification.showToast(
          `¡Ticket ${newTicket.id} creado con éxito! Prioridad: ${priority.toUpperCase()}`,
          'success'
        );
      },
      error: () => {
        this.ngZone.run(() => {
          this.isSubmittingTicket = false;
          this.cdr.detectChanges();
        });
        this.notification.showToast('No se pudo crear el ticket. Inténtalo de nuevo.', 'danger');
      }
    });
  }

  public async openHelpModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HelpModalComponent
    });
    await modal.present();
  }

  ngOnDestroy(): void {
    if (this.ticketsSub) {
      this.ticketsSub.unsubscribe();
    }
    if (this.supabaseChannel) {
      try {
        this.supabaseService.client?.removeChannel(this.supabaseChannel);
      } catch {}
    }
  }
}
