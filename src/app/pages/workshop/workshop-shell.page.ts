import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
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
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carSportOutline, listOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-workshop-shell',
  templateUrl: './workshop-shell.page.html',
  styleUrls: ['./workshop-shell.page.scss'],
  standalone: true,
  imports: [
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
    IonMenuButton,
  ],
})
export class WorkshopShellPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertController);
  private readonly toast = inject(ToastController);

  user = this.auth.user;

  constructor() {
    addIcons({ carSportOutline, listOutline, logOutOutline });
  }

  async logout(): Promise<void> {
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

