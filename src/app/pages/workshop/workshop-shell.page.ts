import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
  MenuController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, calendarOutline, carSportOutline, listOutline, logOutOutline, notificationsOutline, cartOutline, colorPaletteOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ChecklistAlertService } from '../../core/services/checklist-alert.service';

@Component({
  selector: 'app-workshop-shell',
  templateUrl: './workshop-shell.page.html',
  styleUrls: ['./workshop-shell.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonRouterOutlet,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBadge,
    IonMenuButton,
  ],
})
export class WorkshopShellPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertController);
  private readonly toast = inject(ToastController);
  private readonly menu = inject(MenuController);
  readonly checklistAlert = inject(ChecklistAlertService);

  user = this.auth.user;

  constructor() {
    addIcons({ businessOutline, calendarOutline, carSportOutline, listOutline, logOutOutline, notificationsOutline, cartOutline, colorPaletteOutline });
  }

  openChecklistAlert(): void {
    this.checklistAlert.requestOpen();
  }

  closeMenu(): void {
    this.menu.close();
  }

  canSeePartOrders(): boolean {
    const roles = this.user()?.roles ?? [];

    return roles.some((role) => ['Admin', 'Adm', 'Chefe oficina', 'Aux. oficina', 'Aux. Oficina', 'Aux. gestão', 'Gestão'].includes(role));
  }

  canSeePainting(): boolean {
    return this.user()?.permissions?.includes('painting_job_access') ?? false;
  }

  hasPermission(permission: string): boolean {
    return this.user()?.permissions?.includes(permission) ?? false;
  }

  async logout(): Promise<void> {
    this.closeMenu();

    const alert = await this.alert.create({
      header: 'Terminar sessão?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sair',
          role: 'destructive',
          handler: () => {
            this.auth.logout().subscribe({
              next: async () => {
                await this.router.navigateByUrl('/login', { replaceUrl: true });
              },
              error: async () => {
                this.auth.clearSession();
                await this.router.navigateByUrl('/login', { replaceUrl: true });
                const toast = await this.toast.create({
                  message: 'Sessão limpa localmente.',
                  duration: 1600,
                });
                await toast.present();
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }
}
