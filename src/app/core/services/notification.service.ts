import { Injectable, inject } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

/**
 * Servicio de notificaciones y retroalimentación para el usuario.
 * Garantiza cumplimiento de accesibilidad y estados visuales claros.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);

  private currentLoading: HTMLIonLoadingElement | null = null;

  async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'primary' | 'medium' = 'primary',
    duration: number = 2500
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async showAlert(title: string, message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: title,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }

  async showConfirm(title: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: title,
        message,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Confirmar',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  async showLoading(message: string = 'Procesando...'): Promise<void> {
    if (this.currentLoading) {
      await this.currentLoading.dismiss();
    }
    this.currentLoading = await this.loadingCtrl.create({
      message,
      spinner: 'circles'
    });
    await this.currentLoading.present();
  }

  async dismissLoading(): Promise<void> {
    if (this.currentLoading) {
      await this.currentLoading.dismiss();
      this.currentLoading = null;
    }
  }
}
