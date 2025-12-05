import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
export class NavbarComponent implements OnInit {
  router = inject(Router);
  shouldHideSidebar = false;
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

  ngOnInit() {
    this.checkSidebarVisibility(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkSidebarVisibility(event.urlAfterRedirects || event.url);
    });
  }

  private checkSidebarVisibility(url: string) {
    const hiddenRoutes = ['/', '/login', '/register'];
    this.shouldHideSidebar = hiddenRoutes.includes(url);
  }

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
