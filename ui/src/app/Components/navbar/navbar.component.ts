import { Component, inject } from '@angular/core';
import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { LucideAngularModule, LayoutDashboard, Lightbulb, Users, Briefcase, LogOut } from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  imports: [ButtonsComponent, RouterModule, AsyncPipe, LucideAngularModule],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  readonly icons = {
    dashboard: LayoutDashboard,
    ideas: Lightbulb,
    groups: Users,
    projects: Briefcase,
    logout: LogOut
  };
  date = new Date().getFullYear();

  authService = inject(AuthService);

  loggedInStatus: Observable<boolean> = this.authService.isLoggedIn$;

  onLogout() {
    this.authService.logout().subscribe({
      next: (response) => {
        console.log(`Logout successful. ${response.message}`);
      },
      error: (error) => {
        console.error(`Logout failed: ${error.message}`);
      }
    });
  }
}
