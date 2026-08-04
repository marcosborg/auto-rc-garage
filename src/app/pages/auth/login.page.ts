import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  ToastController,
} from '@ionic/angular/standalone';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  isLoading = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.isLoading = true;

    this.auth
      .login(email ?? '', password ?? '')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (user) => {
          const destination = user.permissions.includes('painting_job_access') && !user.permissions.includes('repair_access')
            ? '/workshop/painting'
            : '/workshop/repairs';
          this.router.navigateByUrl(destination, { replaceUrl: true });
        },
        error: async (err) => {
          const toast = await this.toast.create({
            message: err?.error?.message ?? 'Falha no login. Verifica as credenciais.',
            duration: 2200,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }
}
