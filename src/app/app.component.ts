import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    if (this.auth.isLoggedIn()) {
      this.auth.me().subscribe({
        error: () => {
          this.auth.clearSession();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
      });
    }
  }
}
