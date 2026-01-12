import { Component, inject } from '@angular/core';
import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { NotificationsService } from '../../Services/notifications';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ButtonsComponent, RouterModule, AsyncPipe, CommonModule, NgIconsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  date = new Date().getFullYear();
  authService = inject(AuthService);
  notificationsService = inject(NotificationsService);

  loggedInStatus = this.authService.isLoggedIn$;

  onLogout() {
    this.authService.logout().subscribe({
      next: (response) => console.log(`Logout successful. ${response.message}`),
      error: (error) => console.error(`Logout failed: ${error.message}`)
    });
  }
}
