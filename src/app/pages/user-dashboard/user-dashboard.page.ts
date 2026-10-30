/*  */import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone, ElementRef, ViewChild } from '@angular/core';
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

  // Inicialización instantánea con caché local para evitar esperas y spinners congelados
  public products: Product[] = this.supabaseService.getCachedProducts();
  public isLoadingProducts: boolean = false;
  public productSearchQuery: string = '';

  public myTickets: Ticket[] = [];
  public isSubmittingTicket: boolean = false;

  // Gestión de Foto de Perfil (Supabase Storage: bucket 'perfiles')
  @ViewChild('avatarFileInput') public avatarFileInput?: ElementRef<HTMLInputElement>;
  public isUploadingAvatar: boolean = false;

  public get currentUserAvatar(): string {
    return this.authService.getCurrentUser()?.avatarUrl || '';
  }

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
    // Al entrar o reingresar a la vista en Ionic
    this.loadProducts();
    this.subscribeToMyTickets();
  }

  public async loadProducts(): Promise<void> {
    if (this.products.length === 0) {
      this.isLoadingProducts = true;
      this.cdr.detectChanges();
    }

    try {
      const data = await this.supabaseService.getProducts();
      this.ngZone.run(() => {
        this.products = data;
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      console.warn('Error cargando productos:', e);
      this.ngZone.run(() => {
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      });
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

  private setupRealtimeProducts(): void {
    try {
      const sb = this.supabaseService.client;
      if (sb) {
        this.supabaseChannel = sb
          .channel('public:products:user-dashboard-realtime')
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
      console.warn('Realtime channel no inicializado en user-dashboard:', err);
    }
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

  // =================== FOTO DE PERFIL (BUCKET 'perfiles') ===================

  public triggerAvatarUpload(): void {
    this.avatarFileInput?.nativeElement.click();
  }

  public async onAvatarFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notification.showToast('Por favor, selecciona un archivo de imagen (JPG, PNG o WebP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notification.showToast('La imagen es demasiado grande. Tamaño máximo: 5 MB.', 'warning');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notification.showToast('No se detectó un usuario autenticado activo.', 'warning');
      return;
    }

    this.isUploadingAvatar = true;
    this.cdr.detectChanges();

    try {
      const res = await this.supabaseService.uploadProfilePhoto(file, currentUser.id);
      this.authService.updateCurrentUserAvatar(res.url);

      this.ngZone.run(() => {
        this.isUploadingAvatar = false;
        this.cdr.detectChanges();
      });

      if (res.success) {
        this.notification.showToast('¡Foto de perfil actualizada y guardada en el bucket "perfiles" de Supabase!', 'success');
      } else {
        this.notification.showToast('Foto guardada en tu perfil local. Recuerda crear el bucket "perfiles" en Supabase.', 'warning');
      }
    } catch (err: any) {
      this.ngZone.run(() => {
        this.isUploadingAvatar = false;
        this.cdr.detectChanges();
      });
      this.notification.showToast('Error al procesar la foto de perfil: ' + (err?.message || ''), 'danger');
    } finally {
      input.value = '';
    }
  }

  public onAvatarLoadError(): void {
    // Si la imagen falla al cargar
  }

  // =================== FOTOS DE PRODUCTOS (BUCKET 'galeria') ===================

  public getProductImageUrl(product: Product): string {
    return this.supabaseService.getProductImageUrl(product);
  }

  public onProductImageError(event: Event, product: Product): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.onerror = null; // Prevenir ciclo de eventos
      target.src = this.getFallbackProductSvg(product);
    }
  }

  public getFallbackProductSvg(product: Product): string {
    const title = (product.name || 'Producto').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const category = (product.category || 'Hardware').toUpperCase();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3880ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2dd36f;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="220" fill="url(#grad)" rx="12" />
        <circle cx="200" cy="85" r="42" fill="rgba(56, 128, 255, 0.12)" />
        <path d="M185 85 L200 68 L215 85 L200 102 Z" fill="url(#accent)" />
        <circle cx="200" cy="85" r="8" fill="#ffffff" />
        <text x="200" y="145" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${title}</text>
        <text x="200" y="168" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" letter-spacing="1.5">${category} • STORAGE GALERIA</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
