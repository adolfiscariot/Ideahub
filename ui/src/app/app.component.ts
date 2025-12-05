import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './Components/navbar/navbar.component';
import { FooterComponent } from './Components/footer/footer.component';
import { SidebarComponent } from './Components/sidebar/sidebar.component';
import { AuthService } from './Services/auth/auth.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, SidebarComponent, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'Ideahub';
  authService = inject(AuthService);
  router = inject(Router);
  loggedInStatus = this.authService.isLoggedIn$;
  isSidebarCollapsed = false;
  shouldHideSidebar = false;

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
    // Check if the URL is exactly one of the hidden routes or starts with them (optional, but exact match is safer for now)
    this.shouldHideSidebar = hiddenRoutes.includes(url);
  }

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }
}
